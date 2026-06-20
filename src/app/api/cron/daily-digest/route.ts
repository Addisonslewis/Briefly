import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runPipeline } from "@/lib/agents/pipeline";
import { sendDigest, sendAlertEmail } from "@/lib/email/send";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// First entry in ADMIN_EMAILS receives the daily status/alert email.
const ADMIN_EMAIL =
  (process.env.ADMIN_EMAILS || "").split(",")[0]?.trim() ||
  process.env.EMAIL_FROM ||
  "digest@gobriefly.app";

function getToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function eligibleUsersWhere(): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    accounts: { some: {} },
    email: { not: null },
  };

  if (process.env.SUBSCRIPTIONS_ENABLED === "true") {
    where.OR = [
      { planType: "none" },
      { planType: "free" },
      {
        planType: "paid",
        stripeSubscriptionStatus: { in: ["active", "trialing"] },
      },
    ];
  }

  return where;
}

export async function GET(request: NextRequest) {
  const forceUserId = request.nextUrl.searchParams.get("forceUser");
  console.log(`[Cron] Invoked — mode: ${forceUserId ? `worker(${forceUserId})` : "orchestrator"}, time: ${new Date().toISOString()}`);

  // --- Auth ---
  // Require the shared secret on EVERY request. Vercel Cron automatically sends
  // `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET is set in the project
  // env, and the orchestrator forwards the same header to its worker fan-out.
  // Note: do NOT trust the `vercel-cron` User-Agent — it is client-controlled and
  // can be spoofed to bypass auth.
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    console.log("[Cron] Auth failed — missing or invalid CRON_SECRET");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- Worker mode: process a single user ---
  if (forceUserId) {
    const user = await db.user.findUnique({
      where: { id: forceUserId },
      select: { id: true, email: true },
    });
    if (!user) {
      return NextResponse.json(
        { userId: forceUserId, status: "error", error: "User not found" },
        { status: 404 }
      );
    }
    const result = await processUser(user);
    return NextResponse.json(result);
  }

  // --- Orchestrator mode: fan out to parallel worker invocations ---
  const today = getToday();
  const totalEligible = await db.user.count({ where: eligibleUsersWhere() });
  const users = await db.user.findMany({
    where: {
      ...eligibleUsersWhere(),
      digests: {
        none: {
          sentAt: { gte: today },
        },
      },
    },
    orderBy: { id: "asc" },
    select: { id: true, email: true },
  });

  const baseUrl = process.env.NEXTAUTH_URL || "https://www.gobriefly.app";
  const headers = { Authorization: `Bearer ${process.env.CRON_SECRET}` };

  // Dispatch all users in parallel — each gets its own 60s serverless invocation
  const workerResults = await Promise.allSettled(
    users.map(async (user) => {
      const res = await fetch(
        `${baseUrl}/api/cron/daily-digest?forceUser=${user.id}`,
        { headers, cache: "no-store" }
      );
      if (!res.ok) {
        return {
          userId: user.id,
          status: "error",
          error: `Worker returned ${res.status}`,
        };
      }
      return res.json() as Promise<{
        userId: string;
        status: string;
        error?: string;
      }>;
    })
  );

  const workerErrors: { userId: string; error: string }[] = [];
  for (let i = 0; i < workerResults.length; i++) {
    const r = workerResults[i];
    if (r.status === "rejected") {
      workerErrors.push({
        userId: users[i].id,
        error: `Worker failed: ${r.reason}`,
      });
    } else if (r.value.status === "error") {
      workerErrors.push({
        userId: r.value.userId,
        error: r.value.error || "Unknown error",
      });
    }
  }

  // --- Verify against database (source of truth) ---
  const actualSent = await db.digestHistory.count({
    where: { sentAt: { gte: today } },
  });

  // --- Always send status email based on DB truth ---
  try {
    await sendStatusEmail(totalEligible, actualSent, workerErrors);
  } catch (alertError) {
    console.error("[Cron] Status email failed:", alertError);
  }

  return NextResponse.json({
    processed: users.length,
    actualSentToday: actualSent,
    totalEligible,
    workerErrors,
    timestamp: new Date().toISOString(),
  });
}

async function processUser(user: {
  id: string;
  email: string | null;
}): Promise<{ userId: string; status: string; error?: string }> {
  try {
    const { emailHtml: rawEmailHtml, summary } = await runPipeline(user.id);

    const digestRecord = await db.digestHistory.create({
      data: {
        userId: user.id,
        summary,
        emailHtml: rawEmailHtml,
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL || "https://www.gobriefly.app";
    const emailHtml = rawEmailHtml
      .replace("{{DIGEST_ID}}", digestRecord.id)
      .replace(
        "{{FLAG_URL}}",
        `${baseUrl}/flag?digestId=${digestRecord.id}`
      );

    await db.digestHistory.update({
      where: { id: digestRecord.id },
      data: { emailHtml },
    });

    try {
      await sendDigest(user.email!, emailHtml);
      console.log(`[Cron] Digest sent to user ${user.id}`);
      return { userId: user.id, status: "success" };
    } catch (emailError) {
      console.error(
        `[Cron] Email send failed for user ${user.id}:`,
        emailError
      );
      await db.digestHistory
        .delete({ where: { id: digestRecord.id } })
        .catch(() => {});
      return {
        userId: user.id,
        status: "error",
        error: `Email send failed: ${(emailError as Error).message}`,
      };
    }
  } catch (error) {
    console.error(`[Cron] Pipeline error for user ${user.id}:`, error);
    return {
      userId: user.id,
      status: "error",
      error: (error as Error).message || "Unknown error",
    };
  }
}

async function sendStatusEmail(
  totalEligible: number,
  actualSent: number,
  workerErrors: { userId: string; error: string }[]
) {
  const missed = totalEligible - actualSent;
  const date = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const allGood = missed === 0 && totalEligible > 0 && workerErrors.length === 0;

  let failedDetails = "";
  if (workerErrors.length > 0) {
    const failedUserIds = workerErrors.map((e) => e.userId);
    const failedUsers = await db.user.findMany({
      where: { id: { in: failedUserIds } },
      select: { id: true, email: true, name: true },
    });
    failedDetails = failedUsers
      .map(
        (u) =>
          `  - ${u.name || "Unknown"} (${u.email || "no email"}) [${u.id}]`
      )
      .join("\n");
  }

  const errorDetails = workerErrors
    .map((e) => `  - ${e.userId}: ${e.error}`)
    .join("\n");

  const subject = allGood
    ? `Briefly: ${actualSent}/${totalEligible} digests sent on ${date}`
    : `Briefly Alert: ${missed} missed, ${workerErrors.length} error(s) on ${date}`;

  const statusColor = allGood ? "#16a34a" : "#dc2626";
  const statusLabel = allGood ? "All Clear" : "Action Needed";

  await sendAlertEmail(
    ADMIN_EMAIL,
    subject,
    `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: ${statusColor};">${statusLabel} — Daily Digest Report</h2>
      <p><strong>Date:</strong> ${date}</p>
      <p><strong>Total eligible users:</strong> ${totalEligible}</p>
      <p><strong>Digests confirmed in DB:</strong> ${actualSent}</p>
      <p><strong>Missed:</strong> ${missed}</p>
      <p><strong>Worker errors:</strong> ${workerErrors.length}</p>
      ${
        failedDetails
          ? `<h3>Failed Users:</h3><pre style="background: #f3f4f6; padding: 12px; border-radius: 6px; white-space: pre-wrap;">${failedDetails}</pre>`
          : ""
      }
      ${
        errorDetails
          ? `<h3>Error Details:</h3><pre style="background: #fef2f2; padding: 12px; border-radius: 6px; white-space: pre-wrap; color: #991b1b;">${errorDetails}</pre>`
          : ""
      }
      ${
        totalEligible === 0
          ? `<p style="color: #d97706;"><strong>Warning:</strong> No eligible users found. Check subscription/account status.</p>`
          : ""
      }
      <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;" />
      <p style="color: #6b7280; font-size: 14px;">Sent automatically by Briefly's daily cron job.</p>
    </div>`
  );

  console.log(
    `[Cron] Status email sent: ${actualSent}/${totalEligible} confirmed in DB, ${workerErrors.length} errors`
  );
}
