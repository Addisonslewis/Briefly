/**
 * Zero-downtime ENCRYPTION_KEY rotation.
 *
 * Re-encrypts every stored OAuth token in the database from OLD_ENCRYPTION_KEY
 * to NEW_ENCRYPTION_KEY, so you can rotate the key without forcing users to
 * re-authenticate. Safe to re-run (already-migrated rows are detected and skipped).
 *
 * USAGE
 *   1. Dry run (no writes) — shows what would change:
 *        DATABASE_URL=... \
 *        OLD_ENCRYPTION_KEY=<current 64-hex key> \
 *        NEW_ENCRYPTION_KEY=<fresh `openssl rand -hex 32`> \
 *        node scripts/rotate-encryption-key.mjs
 *
 *   2. Commit the change (adds --commit):
 *        DATABASE_URL=... OLD_ENCRYPTION_KEY=... NEW_ENCRYPTION_KEY=... \
 *        node scripts/rotate-encryption-key.mjs --commit
 *
 *   3. Immediately set ENCRYPTION_KEY in Vercel to NEW value and redeploy:
 *        printf '%s' "<NEW_ENCRYPTION_KEY>" | vercel env add ENCRYPTION_KEY production
 *        vercel --prod
 *
 * Run step 2 and 3 back-to-back (and not at 10:00 UTC when the cron fires) so the
 * deployed app and the database are never on different keys for long.
 */
import { PrismaClient } from "@prisma/client";
import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const COMMIT = process.argv.includes("--commit");

function keyBuf(name) {
  const k = process.env[name];
  if (!k || k.length !== 64) {
    throw new Error(`${name} must be set to a 64-character hex string (32 bytes)`);
  }
  return Buffer.from(k, "hex");
}

function decrypt(ciphertext, key) {
  const [ivHex, tagHex, data] = ciphertext.split(":");
  if (!ivHex || !tagHex || data === undefined) throw new Error("bad ciphertext format");
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return decipher.update(data, "hex", "utf8") + decipher.final("utf8");
}

function encrypt(plaintext, key) {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let enc = cipher.update(plaintext, "utf8", "hex");
  enc += cipher.final("hex");
  return `${iv.toString("hex")}:${cipher.getAuthTag().toString("hex")}:${enc}`;
}

/** Decrypt with OLD; if that fails, see if it's already on NEW (idempotent re-run). */
function reEncrypt(value, oldKey, newKey) {
  if (!value) return { value, status: "empty" };
  try {
    return { value: encrypt(decrypt(value, oldKey), newKey), status: "migrated" };
  } catch {
    try {
      decrypt(value, newKey);
      return { value, status: "already-new" };
    } catch {
      return { value, status: "undecryptable" };
    }
  }
}

async function main() {
  const oldKey = keyBuf("OLD_ENCRYPTION_KEY");
  const newKey = keyBuf("NEW_ENCRYPTION_KEY");
  if (Buffer.compare(oldKey, newKey) === 0) {
    throw new Error("OLD_ENCRYPTION_KEY and NEW_ENCRYPTION_KEY are identical — nothing to do");
  }

  const db = new PrismaClient();
  const accounts = await db.account.findMany({
    select: { id: true, access_token: true, refresh_token: true },
  });

  const counts = { migrated: 0, "already-new": 0, empty: 0, undecryptable: 0 };
  console.log(`${COMMIT ? "COMMIT" : "DRY RUN"} — scanning ${accounts.length} account(s)\n`);

  for (const acct of accounts) {
    const access = reEncrypt(acct.access_token, oldKey, newKey);
    const refresh = reEncrypt(acct.refresh_token, oldKey, newKey);
    counts[access.status]++;
    counts[refresh.status]++;

    if (access.status === "undecryptable" || refresh.status === "undecryptable") {
      console.warn(`  ⚠ account ${acct.id}: token does not decrypt with OLD or NEW key — left untouched`);
    }

    const needsWrite = access.status === "migrated" || refresh.status === "migrated";
    if (needsWrite && COMMIT) {
      await db.account.update({
        where: { id: acct.id },
        data: { access_token: access.value, refresh_token: refresh.value },
      });
    }
  }

  console.log("\nResult (per token field):");
  console.table(counts);
  if (!COMMIT) console.log("Dry run only — re-run with --commit to write changes.");
  else console.log("✅ Done. Now set ENCRYPTION_KEY=<NEW value> in Vercel and redeploy.");

  await db.$disconnect();
}

main().catch((e) => {
  console.error("Rotation failed:", e.message);
  process.exit(1);
});
