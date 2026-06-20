import type { Tweet } from "./x-client";

type FeedProvider = "twitter" | "socialdata";

function getProvider(): FeedProvider {
  const provider = process.env.FEED_PROVIDER || "socialdata";
  if (provider !== "twitter" && provider !== "socialdata") {
    console.warn(
      `[FeedProvider] Unknown FEED_PROVIDER "${provider}", defaulting to "socialdata"`
    );
    return "socialdata";
  }
  return provider;
}

export interface FetchTimelineParams {
  /** Prisma Account.id for the user's Twitter account */
  accountId: string;
  /** Twitter numeric user ID (Account.providerAccountId) */
  twitterUserId: string;
  /** Decrypted OAuth access token (only needed for provider="twitter") */
  accessToken: string;
}

/**
 * Fetch the user's Twitter timeline using whichever provider is configured.
 *
 * - "twitter": Uses official X API v2 (requires $200/mo Basic tier)
 * - "socialdata": Uses SocialData.tools synthetic timeline (~$3-5/mo)
 *
 * Switch by setting FEED_PROVIDER env var.
 */
export async function fetchTwitterFeed(
  params: FetchTimelineParams
): Promise<Tweet[]> {
  const provider = getProvider();

  if (provider === "twitter") {
    const { fetchTimeline, fetchAuthenticatedUserId } = await import(
      "./x-client"
    );
    const userId = await fetchAuthenticatedUserId(params.accessToken);
    return fetchTimeline(params.accessToken, userId);
  }

  const { fetchSyntheticTimeline } = await import("./socialdata-client");
  return fetchSyntheticTimeline(params.accountId, params.twitterUserId);
}

export { getProvider };
