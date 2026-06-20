import { fetchWithBackoff } from "./rate-limiter";

const X_API_BASE = "https://api.x.com/2";

export interface Tweet {
  id: string;
  text: string;
  created_at: string;
  author_id: string;
  public_metrics: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
    impression_count: number;
  };
  entities?: {
    urls?: Array<{
      expanded_url: string;
      display_url: string;
    }>;
    mentions?: Array<{
      username: string;
    }>;
    hashtags?: Array<{
      tag: string;
    }>;
  };
  referenced_tweets?: Array<{
    type: "retweeted" | "quoted" | "replied_to";
    id: string;
  }>;
}

interface TimelineResponse {
  data: Tweet[];
  meta: {
    next_token?: string;
    result_count: number;
  };
}

/**
 * Fetch the authenticated user's reverse-chronological timeline.
 * Uses the official X API v2 — requires OAuth 2.0 User Context.
 */
export async function fetchTimeline(
  accessToken: string,
  userId: string,
  maxResults: number = 100
): Promise<Tweet[]> {
  const params = new URLSearchParams({
    max_results: Math.min(maxResults, 100).toString(),
    "tweet.fields":
      "created_at,public_metrics,entities,referenced_tweets,author_id",
    expansions: "author_id",
  });

  const response = await fetchWithBackoff(
    `${X_API_BASE}/users/${userId}/timelines/reverse_chronological?${params}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  const data: TimelineResponse = await response.json();
  return data.data || [];
}

/**
 * Fetch the authenticated user's ID from their access token.
 */
export async function fetchAuthenticatedUserId(
  accessToken: string
): Promise<string> {
  const response = await fetchWithBackoff(`${X_API_BASE}/users/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();
  return data.data.id;
}
