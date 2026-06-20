import Anthropic from "@anthropic-ai/sdk";
import type { TextBlock } from "@anthropic-ai/sdk/resources/messages.mjs";
import type { Tweet } from "@/lib/api/x-client";
import type { LinkedInPost } from "@/lib/api/linkedin-client";

export type PostCategory = "News" | "Opinion" | "Noise";

export interface CategorizedPost {
  id: string;
  platform: "x" | "linkedin";
  text: string;
  author: string;
  category: PostCategory;
  confidence: number;
  createdAt: string;
  metrics?: {
    engagement: number;
  };
  urls?: string[];
}

interface UserSignal {
  keywords: string[];
  ignoredTopics: string[];
  signalDescription: string;
}

function replaceTcoUrls(text: string, entities?: Tweet["entities"]): string {
  const tcoPattern = /https?:\/\/t\.co\/\S+/g;
  const tcoMatches = text.match(tcoPattern) || [];
  let result = text;
  for (let i = 0; i < tcoMatches.length; i++) {
    if (entities?.urls?.[i]?.expanded_url) {
      result = result.replace(tcoMatches[i], entities.urls[i].expanded_url);
    } else {
      result = result.replace(tcoMatches[i], "");
    }
  }
  return result.replace(/\s{2,}/g, " ").trim();
}

function normalizePosts(
  tweets: Tweet[],
  linkedInPosts: LinkedInPost[]
): Array<{ id: string; platform: "x" | "linkedin"; text: string; author: string; createdAt: string; engagement: number; urls: string[] }> {
  const normalized = [];

  for (const tweet of tweets) {
    if (tweet.referenced_tweets?.some((r) => r.type === "retweeted")) continue;

    normalized.push({
      id: tweet.id,
      platform: "x" as const,
      text: replaceTcoUrls(tweet.text, tweet.entities),
      author: tweet.author_id,
      createdAt: tweet.created_at,
      engagement:
        (tweet.public_metrics?.like_count || 0) +
        (tweet.public_metrics?.retweet_count || 0) +
        (tweet.public_metrics?.reply_count || 0),
      urls:
        tweet.entities?.urls?.map((u) => u.expanded_url).filter(Boolean) || [],
    });
  }

  for (const post of linkedInPosts) {
    normalized.push({
      id: post.id,
      platform: "linkedin" as const,
      text: post.commentary || post.content?.article?.description || "",
      author: post.author,
      createdAt: new Date(post.publishedAt).toISOString(),
      engagement: 0,
      urls: post.content?.article?.source ? [post.content.article.source] : [],
    });
  }

  return normalized;
}

export async function categorizePosts(
  tweets: Tweet[],
  linkedInPosts: LinkedInPost[],
  userSignal: UserSignal
): Promise<CategorizedPost[]> {
  let posts = normalizePosts(tweets, linkedInPosts);

  if (posts.length === 0) return [];

  const MAX_POSTS = 50;
  if (posts.length > MAX_POSTS) {
    posts.sort((a, b) => b.engagement - a.engagement);
    posts = posts.slice(0, MAX_POSTS);
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    timeout: 25000,
    maxRetries: 2,
  });

  const batchSize = 50;
  const results: CategorizedPost[] = [];

  for (let i = 0; i < posts.length; i += batchSize) {
    const batch = posts.slice(i, i + batchSize);

    const prompt = `You are a content categorization agent for a personalized news digest.

USER PREFERENCES:
${userSignal.keywords.length > 0 ? `- Interests: ${userSignal.keywords.join(", ")}` : ""}
${userSignal.signalDescription ? `- Signal description: "${userSignal.signalDescription}"` : ""}
${userSignal.ignoredTopics.length > 0 ? `- Topics to IGNORE: ${userSignal.ignoredTopics.join(", ")}` : ""}

IMPORTANT: These posts are from the user's own feed. Be INCLUSIVE - the goal is to digest what they're seeing, not aggressively filter it. Only mark something as "Noise" if it's truly spam, repetitive promotional content, or explicitly on ignored topics.

TASK: Categorize each post below as one of:
- "News": Factual information, announcements, product launches, data, research findings, industry developments, or breaking news.
- "Opinion": Commentary, analysis, personal takes, insights, discussions, or perspectives on any topic.
- "Noise": ONLY pure spam, repetitive self-promotion, or topics explicitly in the ignore list. When in doubt, prefer News or Opinion.

POSTS:
${batch
  .map(
    (p, idx) =>
      `[${idx}] (${p.platform}) ${p.text.substring(0, 500)}`
  )
  .join("\n\n")}

Respond ONLY with a valid JSON array. Each element must have:
- "index": number (matching the [index] above)
- "category": "News" | "Opinion" | "Noise"
- "confidence": number between 0 and 1

Example: [{"index": 0, "category": "News", "confidence": 0.95}]`;

    try {
      const response = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        temperature: 0,
        messages: [{ role: "user", content: prompt }],
      });

      const content = response.content
        .filter((block) => block.type === "text")
        .map((block) => (block as TextBlock).text)
        .join("");

      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.warn(`[Categorizer] No JSON array in response for batch ${i}, treating all as Opinion`);
        for (const post of batch) {
          results.push({
            id: post.id,
            platform: post.platform,
            text: post.text,
            author: post.author,
            category: "Opinion",
            confidence: 0.5,
            createdAt: post.createdAt,
            metrics: { engagement: post.engagement },
            urls: post.urls,
          });
        }
        continue;
      }

      let categorizations: Array<{
        index: number;
        category: PostCategory;
        confidence: number;
      }>;

      try {
        categorizations = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.warn(`[Categorizer] JSON parse failed for batch ${i}, treating all as Opinion:`, parseError);
        for (const post of batch) {
          results.push({
            id: post.id,
            platform: post.platform,
            text: post.text,
            author: post.author,
            category: "Opinion",
            confidence: 0.5,
            createdAt: post.createdAt,
            metrics: { engagement: post.engagement },
            urls: post.urls,
          });
        }
        continue;
      }

      const categorizedIndexes = new Set<number>();
      for (const cat of categorizations) {
        const post = batch[cat.index];
        if (!post) continue;
        categorizedIndexes.add(cat.index);

        results.push({
          id: post.id,
          platform: post.platform,
          text: post.text,
          author: post.author,
          category: cat.category,
          confidence: cat.confidence,
          createdAt: post.createdAt,
          metrics: { engagement: post.engagement },
          urls: post.urls,
        });
      }

      // Any posts not mentioned by Claude default to Opinion
      for (let j = 0; j < batch.length; j++) {
        if (!categorizedIndexes.has(j)) {
          const post = batch[j];
          results.push({
            id: post.id,
            platform: post.platform,
            text: post.text,
            author: post.author,
            category: "Opinion",
            confidence: 0.5,
            createdAt: post.createdAt,
            metrics: { engagement: post.engagement },
            urls: post.urls,
          });
        }
      }
    } catch (error) {
      console.error(`[Categorizer] API call failed for batch ${i}, treating all as Opinion:`, error);
      for (const post of batch) {
        results.push({
          id: post.id,
          platform: post.platform,
          text: post.text,
          author: post.author,
          category: "Opinion",
          confidence: 0.5,
          createdAt: post.createdAt,
          metrics: { engagement: post.engagement },
          urls: post.urls,
        });
      }
    }
  }

  return results;
}
