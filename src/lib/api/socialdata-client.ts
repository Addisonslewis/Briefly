import { fetchWithBackoff } from "./rate-limiter";
import type { Tweet } from "./x-client";
import { db } from "@/lib/db";

const SOCIALDATA_API_BASE = "https://api.socialdata.tools";

// ─── SocialData raw response types ───────────────────────────

interface SocialDataUser {
  id_str: string;
  screen_name: string;
  name: string;
  followers_count: number;
  friends_count: number;
}

interface SocialDataFriendsResponse {
  next_cursor: string;
  users: SocialDataUser[];
}

interface SocialDataTweet {
  id_str: string;
  full_text: string;
  tweet_created_at: string;
  user: {
    id_str: string;
    screen_name: string;
  };
  reply_count: number;
  retweet_count: number;
  favorite_count: number;
  quote_count: number;
  views_count?: number;
  entities?: {
    urls?: Array<{ expanded_url: string; display_url: string }>;
    user_mentions?: Array<{ screen_name: string }>;
    hashtags?: Array<{ text: string }>;
  };
  retweeted_status?: SocialDataTweet;
  quoted_status?: SocialDataTweet;
  in_reply_to_status_id_str?: string | null;
}

interface SocialDataSearchResponse {
  next_cursor: string;
  tweets: SocialDataTweet[];
}

// ─── Helpers ─────────────────────────────────────────────────

function getApiKey(): string {
  const key = process.env.SOCIALDATA_API_KEY;
  if (!key) throw new Error("SOCIALDATA_API_KEY is not set");
  return key;
}

function socialDataHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${getApiKey()}`,
    Accept: "application/json",
  };
}

/**
 * Parse various date formats from SocialData into ISO 8601.
 * Handles Twitter's "Thu Mar 03 12:00:00 +0000 2026" and ISO strings.
 */
function parseDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString();
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d.toISOString();
  // Fallback: try rearranging Twitter's format "Day Mon DD HH:MM:SS +0000 YYYY"
  const parts = dateStr.split(" ");
  if (parts.length >= 6) {
    const rearranged = `${parts[1]} ${parts[2]}, ${parts[5]} ${parts[3]} ${parts[4]}`;
    const d2 = new Date(rearranged);
    if (!isNaN(d2.getTime())) return d2.toISOString();
  }
  return new Date().toISOString(); // Last resort: use current time
}

/**
 * Map a SocialData tweet (v1.1 format) to our Tweet interface (v2 format).
 */
function mapToTweet(raw: SocialDataTweet): Tweet {
  const referenced_tweets: NonNullable<Tweet["referenced_tweets"]> = [];

  if (raw.retweeted_status) {
    referenced_tweets.push({
      type: "retweeted",
      id: raw.retweeted_status.id_str,
    });
  }
  if (raw.quoted_status) {
    referenced_tweets.push({
      type: "quoted",
      id: raw.quoted_status.id_str,
    });
  }
  if (raw.in_reply_to_status_id_str) {
    referenced_tweets.push({
      type: "replied_to",
      id: raw.in_reply_to_status_id_str,
    });
  }

  return {
    id: raw.id_str,
    text: raw.full_text,
    created_at: parseDate(raw.tweet_created_at),
    author_id: raw.user.id_str,
    public_metrics: {
      retweet_count: raw.retweet_count || 0,
      reply_count: raw.reply_count || 0,
      like_count: raw.favorite_count || 0,
      quote_count: raw.quote_count || 0,
      impression_count: raw.views_count || 0,
    },
    entities: {
      urls: raw.entities?.urls?.map((u) => ({
        expanded_url: u.expanded_url,
        display_url: u.display_url,
      })),
      mentions: raw.entities?.user_mentions?.map((m) => ({
        username: m.screen_name,
      })),
      hashtags: raw.entities?.hashtags?.map((h) => ({
        tag: h.text,
      })),
    },
    referenced_tweets:
      referenced_tweets.length > 0 ? referenced_tweets : undefined,
  };
}

// ─── Following list (with DB cache) ─────────────────────────

const FOLLOWING_CACHE_DAYS = 7;

/**
 * Paginate through SocialData's friends/list to get all accounts a user follows.
 */
async function fetchFollowingFromApi(
  twitterUserId: string
): Promise<Array<{ userId: string; screenName: string; displayName: string }>> {
  const following: Array<{
    userId: string;
    screenName: string;
    displayName: string;
  }> = [];
  let cursor: string | undefined;

  do {
    const params = new URLSearchParams({ user_id: twitterUserId });
    if (cursor) params.set("cursor", cursor);

    const response = await fetchWithBackoff(
      `${SOCIALDATA_API_BASE}/twitter/friends/list?${params}`,
      { headers: socialDataHeaders() }
    );

    const data: SocialDataFriendsResponse = await response.json();

    for (const user of data.users) {
      following.push({
        userId: user.id_str,
        screenName: user.screen_name,
        displayName: user.name,
      });
    }

    cursor =
      data.next_cursor && data.next_cursor !== "0"
        ? data.next_cursor
        : undefined;
  } while (cursor);

  return following;
}

/**
 * Get cached following list, refreshing from API if stale (>7 days).
 */
export async function getFollowingList(
  accountId: string,
  twitterUserId: string
): Promise<string[]> {
  const cacheThreshold = new Date();
  cacheThreshold.setDate(cacheThreshold.getDate() - FOLLOWING_CACHE_DAYS);

  const cachedCount = await db.twitterFollowing.count({
    where: {
      accountId,
      fetchedAt: { gte: cacheThreshold },
    },
  });

  if (cachedCount > 0) {
    const cached = await db.twitterFollowing.findMany({
      where: { accountId },
      select: { screenName: true },
    });
    console.log(
      `[SocialData] Using cached following list: ${cached.length} accounts`
    );
    return cached.map((f) => f.screenName);
  }

  // Cache is stale or empty — fetch from API
  console.log(
    `[SocialData] Fetching following list from API for account ${accountId}`
  );
  const following = await fetchFollowingFromApi(twitterUserId);

  // Clear old cache and write new data atomically
  await db.$transaction([
    db.twitterFollowing.deleteMany({ where: { accountId } }),
    ...(following.length > 0
      ? [
          db.twitterFollowing.createMany({
            data: following.map((f) => ({
              accountId,
              followingUserId: f.userId,
              screenName: f.screenName,
              displayName: f.displayName,
            })),
            skipDuplicates: true,
          }),
        ]
      : []),
  ]);

  console.log(`[SocialData] Cached ${following.length} following accounts`);
  return following.map((f) => f.screenName);
}

// ─── Search for tweets (synthetic timeline) ──────────────────

const MAX_QUERY_LENGTH = 500; // SocialData limit is 512, leave margin
const MAX_SEARCH_PAGES = 2;
const MAX_FOLLOWS_TO_SEARCH = 50; // Cap to stay within Vercel's 60s timeout

/**
 * Batch-search for recent tweets from a list of screen names.
 * Dynamically groups handles to stay under the 512-char query limit.
 */
async function searchRecentTweets(
  screenNames: string[]
): Promise<SocialDataTweet[]> {
  const allTweets: SocialDataTweet[] = [];
  const suffix = " within_time:24h";

  // Build batches dynamically based on query length
  const batches: string[][] = [];
  let currentBatch: string[] = [];
  let currentLen = 1; // opening "("

  for (const name of screenNames) {
    const clause = `from:${name}`;
    const addition = currentBatch.length === 0 ? clause.length : 4 + clause.length; // " OR " + clause
    const totalIfAdded = currentLen + addition + 1 + suffix.length; // +1 for ")"

    if (totalIfAdded > MAX_QUERY_LENGTH && currentBatch.length > 0) {
      batches.push(currentBatch);
      currentBatch = [name];
      currentLen = 1 + clause.length;
    } else {
      currentBatch.push(name);
      currentLen += addition;
    }
  }
  if (currentBatch.length > 0) batches.push(currentBatch);

  for (const batch of batches) {
    const fromClauses = batch.map((name) => `from:${name}`).join(" OR ");
    const query = `(${fromClauses})${suffix}`;

    let cursor: string | undefined;
    let pageCount = 0;

    do {
      const params = new URLSearchParams({ query, type: "Latest" });
      if (cursor) params.set("cursor", cursor);

      const response = await fetchWithBackoff(
        `${SOCIALDATA_API_BASE}/twitter/search?${params}`,
        { headers: socialDataHeaders() }
      );

      const data: SocialDataSearchResponse = await response.json();
      if (data.tweets) {
        allTweets.push(...data.tweets);
      }

      cursor =
        data.next_cursor && data.next_cursor !== ""
          ? data.next_cursor
          : undefined;
      pageCount++;
    } while (cursor && pageCount < MAX_SEARCH_PAGES);
  }

  return allTweets;
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Build a synthetic timeline for a Twitter user via SocialData:
 * 1. Get (cached) following list
 * 2. Search for recent tweets from those accounts
 * 3. Map to Tweet[] interface and sort reverse-chronological
 */
export async function fetchSyntheticTimeline(
  accountId: string,
  twitterUserId: string
): Promise<Tweet[]> {
  const screenNames = await getFollowingList(accountId, twitterUserId);

  if (screenNames.length === 0) {
    console.warn(
      `[SocialData] User ${twitterUserId} follows 0 accounts — empty timeline`
    );
    return [];
  }

  // Cap to stay within Vercel function timeout
  const searchNames = screenNames.slice(0, MAX_FOLLOWS_TO_SEARCH);

  console.log(
    `[SocialData] Searching tweets from ${searchNames.length} of ${screenNames.length} followed accounts`
  );

  const rawTweets = await searchRecentTweets(searchNames);

  console.log(`[SocialData] Found ${rawTweets.length} tweets`);

  const tweets = rawTweets.map(mapToTweet);
  tweets.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return tweets;
}
