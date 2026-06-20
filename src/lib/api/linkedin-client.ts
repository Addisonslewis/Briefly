import { fetchWithBackoff } from "./rate-limiter";

const LINKEDIN_API_BASE = "https://api.linkedin.com/v2";

export interface LinkedInPost {
  id: string;
  author: string;
  commentary?: string;
  content?: {
    article?: {
      title: string;
      description: string;
      source: string;
    };
  };
  publishedAt: number;
  distribution: {
    feedDistribution: string;
  };
  lifecycleState: string;
  visibility: string;
}

interface FeedResponse {
  elements: LinkedInPost[];
  paging?: {
    start: number;
    count: number;
    total: number;
  };
}

/**
 * Fetch the authenticated user's LinkedIn feed.
 * Uses the official LinkedIn v2 API — requires OAuth 2.0 with r_member_social.
 */
export async function fetchFeed(
  accessToken: string,
  count: number = 100
): Promise<LinkedInPost[]> {
  const params = new URLSearchParams({
    count: Math.min(count, 100).toString(),
    q: "feedType",
    feedType: "FOLLOWING",
  });

  const response = await fetchWithBackoff(
    `${LINKEDIN_API_BASE}/feed?${params}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-Restli-Protocol-Version": "2.0.0",
        "LinkedIn-Version": "202401",
      },
    }
  );

  const data: FeedResponse = await response.json();
  return data.elements || [];
}

/**
 * Fetch the authenticated user's LinkedIn profile URN.
 */
export async function fetchProfileUrn(
  accessToken: string
): Promise<string> {
  const response = await fetchWithBackoff(`${LINKEDIN_API_BASE}/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();
  return data.id;
}
