import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { fetchTwitterFeed } from "@/lib/api/feed-provider";
import { fetchFeed } from "@/lib/api/linkedin-client";
import { categorizePosts } from "./categorizer";
import { synthesizePosts, type Digest } from "./synthesizer";
import { refreshTwitterToken } from "@/lib/api/token-refresh";
import type { Tweet } from "@/lib/api/x-client";
import type { LinkedInPost } from "@/lib/api/linkedin-client";

export interface PipelineResult {
  digest: Digest;
  emailHtml: string;
  summary: string;
}

/**
 * Runs the full Briefly pipeline for a single user:
 * 1. Fetches tokens from DB and decrypts them
 * 2. Calls APIs to get feed data
 * 3. Categorizes posts via LLM
 * 4. Synthesizes into digest
 * 5. Returns structured result
 */
export async function runPipeline(userId: string): Promise<PipelineResult> {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      accounts: true,
      preferences: true,
    },
  });

  const userSignal = {
    keywords: user.preferences?.keywords || [],
    ignoredTopics: user.preferences?.ignoredTopics || [],
    signalDescription: user.preferences?.signalDescription || "",
  };

  let tweets: Tweet[] = [];
  let linkedInPosts: LinkedInPost[] = [];

  // --- Fetch Twitter feed ---
  const xAccount = user.accounts.find((a) => a.provider === "twitter");
  if (xAccount) {
    const provider = process.env.FEED_PROVIDER || "socialdata";

    let accessToken: string;
    try {
      accessToken = xAccount.access_token ? decrypt(xAccount.access_token) : "";
    } catch (decryptErr) {
      console.error(`[Pipeline] Failed to decrypt token for user ${userId}:`, decryptErr);
      accessToken = "";
    }

    if (accessToken) {
      try {
        tweets = await fetchTwitterFeed({
          accountId: xAccount.id,
          twitterUserId: xAccount.providerAccountId,
          accessToken,
        });
        console.log(`[Pipeline] Twitter fetch: ${tweets.length} tweets`);
      } catch (error) {
        const errorMsg = (error as Error).message;

        if (provider === "twitter" && errorMsg.includes("401")) {
          console.log(`[Pipeline] Token expired for user ${userId}, refreshing...`);
          const newAccessToken = await refreshTwitterToken(userId);

          if (newAccessToken) {
            try {
              tweets = await fetchTwitterFeed({
                accountId: xAccount.id,
                twitterUserId: xAccount.providerAccountId,
                accessToken: newAccessToken,
              });
              console.log(`[Pipeline] Fetched ${tweets.length} tweets after token refresh`);
            } catch (retryError) {
              console.error(`[Pipeline] Failed after token refresh for user ${userId}:`, retryError);
            }
          } else {
            console.error(`[Pipeline] Token refresh failed for user ${userId}`);
          }
        } else {
          console.error(`[Pipeline] Twitter fetch failed for user ${userId}:`, error);
        }
      }
    }
  }

  // --- Fetch LinkedIn feed ---
  const linkedInAccount = user.accounts.find((a) => a.provider === "linkedin");
  if (linkedInAccount?.access_token) {
    try {
      const accessToken = decrypt(linkedInAccount.access_token);
      linkedInPosts = await fetchFeed(accessToken);
    } catch (error) {
      console.error(`[Pipeline] LinkedIn fetch failed for user ${userId}:`, error);
    }
  }

  // --- Categorize ---
  const categorized = await categorizePosts(tweets, linkedInPosts, userSignal);
  console.log(`[Pipeline] Categorized ${categorized.length} posts`);

  // --- Synthesize ---
  const digest = await synthesizePosts(categorized);

  // --- Render email ---
  const { renderDigestEmail } = await import(
    "@/lib/email/templates/daily-digest"
  );
  const emailHtml = renderDigestEmail(digest, user.name || "Reader");

  // --- Build summary ---
  const summaryParts: string[] = [];
  if (digest.bigStory) {
    summaryParts.push(`Big Story: ${digest.bigStory.title}`);
  }
  for (const h of digest.professionalPulse) {
    summaryParts.push(`Professional Pulse: ${h.title}`);
  }
  for (const h of digest.xFactor) {
    summaryParts.push(`X-Factor: ${h.title}`);
  }
  const summary = summaryParts.join("\n") || "No significant stories found.";

  return { digest, emailHtml, summary };
}
