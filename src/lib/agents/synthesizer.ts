import Anthropic from "@anthropic-ai/sdk";
import type { TextBlock } from "@anthropic-ai/sdk/resources/messages.mjs";
import type { CategorizedPost } from "./categorizer";

export interface DigestHeadline {
  title: string;
  summary: string;
  perspectives: string[];
  postIds: string[];
  urls: string[];
}

export interface Digest {
  bigStory: DigestHeadline | null;
  professionalPulse: DigestHeadline[];
  xFactor: DigestHeadline[];
  generatedAt: string;
}

function emptyDigest(): Digest {
  return {
    bigStory: null,
    professionalPulse: [],
    xFactor: [],
    generatedAt: new Date().toISOString(),
  };
}

function safeHeadline(raw: unknown): DigestHeadline | null {
  if (!raw || typeof raw !== "object") return null;
  const h = raw as Record<string, unknown>;
  return {
    title: typeof h.title === "string" ? h.title : "Untitled",
    summary: typeof h.summary === "string" ? h.summary : "",
    perspectives: Array.isArray(h.perspectives)
      ? h.perspectives.filter((p): p is string => typeof p === "string")
      : [],
    postIds: Array.isArray(h.postIds)
      ? h.postIds.filter((p): p is string => typeof p === "string")
      : [],
    urls: Array.isArray(h.urls)
      ? h.urls.filter((u): u is string => typeof u === "string")
      : [],
  };
}

export async function synthesizePosts(
  categorizedPosts: CategorizedPost[]
): Promise<Digest> {
  const relevantPosts = categorizedPosts.filter(
    (p) => p.category !== "Noise"
  );

  if (relevantPosts.length === 0) {
    return emptyDigest();
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  const linkedInPosts = relevantPosts.filter((p) => p.platform === "linkedin");
  const xPosts = relevantPosts.filter((p) => p.platform === "x");

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    timeout: 25000,
    maxRetries: 2,
  });

  const prompt = `You are a senior newsletter editor writing a daily digest. Write in a crisp, authoritative tone — like Morning Brew or The Hustle. No emojis. No hashtags. No filler.

POSTS FROM X (Twitter):
${xPosts
  .map((p) => {
    const urls = p.urls?.length ? ` | Links: ${p.urls.join(", ")}` : "";
    return `[${p.id}] ${p.text.substring(0, 400)} (Engagement: ${p.metrics?.engagement || 0})${urls}`;
  })
  .join("\n\n")}

POSTS FROM LINKEDIN:
${linkedInPosts
  .map((p) => {
    const urls = p.urls?.length ? ` | Links: ${p.urls.join(", ")}` : "";
    return `[${p.id}] ${p.text.substring(0, 400)}${urls}`;
  })
  .join("\n\n")}

TASK: Create a digest with these sections:

1. "bigStory": The single most discussed/important topic across BOTH platforms. Synthesize multiple posts on the same topic into one cohesive narrative. If no clear big story exists, set to null.

2. "professionalPulse": LinkedIn-specific industry trends, career shifts, or business news. Up to 3 headlines. Can be empty if no LinkedIn posts.

3. "xFactor": Fast-moving tech/news trends from X. Up to 3 headlines. Can be empty if no X posts.

WRITING RULES:
- Titles: punchy, specific, max 80 chars. No URLs in titles.
- Summaries: 2-3 crisp sentences that synthesize the story. No URLs in summaries. Write with authority — don't hedge with "some say" or "it appears."
- Perspectives: Each perspective MUST start with a label prefix. Use genuinely distinct viewpoints, not restatements of the same point.
  - bigStory: exactly 2 perspectives — "Bull: ...", "Bear: ..."
  - professionalPulse: exactly 2 perspectives — "Bull: ...", "Bear: ..."
  - xFactor: no perspectives (empty array)
- URLs: populate the "urls" array ONLY from the "Links:" data provided with each post. Never fabricate URLs. Never put URLs in titles or summaries.

For each headline, provide:
- "title": string
- "summary": string
- "perspectives": string[] (with label prefixes as described above)
- "postIds": string[] (IDs of source posts)
- "urls": string[] (from the Links data only)

Respond ONLY with valid JSON:
{
  "bigStory": { "title": "", "summary": "", "perspectives": [], "postIds": [], "urls": [] } | null,
  "professionalPulse": [{ ... }],
  "xFactor": [{ ... }]
}`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      temperature: 0.3,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content
      .filter((block) => block.type === "text")
      .map((block) => (block as TextBlock).text)
      .join("");

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn("[Synthesizer] No JSON object in Claude response");
      return emptyDigest();
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.warn("[Synthesizer] JSON parse failed:", parseError);
      return emptyDigest();
    }

    const bigStory = safeHeadline(parsed.bigStory);
    const professionalPulse = Array.isArray(parsed.professionalPulse)
      ? parsed.professionalPulse.map(safeHeadline).filter((h): h is DigestHeadline => h !== null)
      : [];
    const xFactor = Array.isArray(parsed.xFactor)
      ? parsed.xFactor.map(safeHeadline).filter((h): h is DigestHeadline => h !== null)
      : [];

    return {
      bigStory,
      professionalPulse,
      xFactor,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[Synthesizer] API call failed:", error);
    throw error;
  }
}
