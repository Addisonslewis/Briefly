import type { Digest, DigestHeadline } from "@/lib/agents/synthesizer";

/**
 * Escape text before interpolating it into HTML. All digest copy is derived from
 * tweets/LLM output (attacker-influenceable), so it must never be trusted as markup.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Only allow http(s) links into the email, and HTML-escape the result so a crafted
 * URL can't break out of the href attribute. Returns "" for anything unsafe.
 */
function safeHref(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return escapeHtml(parsed.toString());
  } catch {
    return "";
  }
}

function formatUrlDisplay(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return escapeHtml(hostname);
  } catch {
    return escapeHtml(url);
  }
}

function renderUrlPills(urls: string[] | undefined | null): string {
  if (!urls || urls.length === 0) return "";
  return `
    <div style="margin-top:10px;">
      ${urls
        .map((url) => ({ href: safeHref(url), url }))
        .filter((u) => u.href)
        .map(
          ({ href, url }) =>
            `<a href="${href}" style="display:inline-block;margin:0 6px 6px 0;padding:4px 10px;background:#eff6ff;color:#2563eb;text-decoration:none;font-size:12px;font-weight:500;border-radius:12px;line-height:1.4;">${formatUrlDisplay(url)}&nbsp;&#8599;</a>`
        )
        .join("")}
    </div>
  `;
}

function renderSourceLinks(postIds: string[] | undefined | null): string {
  if (!postIds || postIds.length === 0) return "";
  const links = postIds
    .map(
      (id, i) =>
        `<a href="https://x.com/i/status/${encodeURIComponent(id)}" style="color:#9ca3af;text-decoration:none;font-size:11px;" target="_blank">[${i + 1}]</a>`
    )
    .join("&nbsp; ");
  return `<div style="margin-top:8px;"><span style="font-size:11px;color:#d1d5db;">X links:</span>&nbsp; ${links}</div>`;
}

function renderPerspective(p: string): string {
  const match = p.match(/^(Bull|Bear):\s*(.*)/);
  if (match) {
    const label = match[1];
    const text = escapeHtml(match[2]);
    return `<div style="margin-bottom:6px;padding:0;font-size:13px;color:#64748b;line-height:1.5;"><strong style="color:#1e293b;">${label}:</strong> ${text}</div>`;
  }
  return `<div style="margin-bottom:6px;padding:0;font-size:13px;color:#64748b;line-height:1.5;">&mdash; ${escapeHtml(p)}</div>`;
}

function renderHeadline(headline: DigestHeadline): string {
  const perspectives = (headline.perspectives || [])
    .map(renderPerspective)
    .join("");

  return `
    <div style="margin-bottom:28px;">
      <h3 style="margin:0 0 6px;font-size:17px;font-weight:600;color:#1e293b;line-height:1.3;">${escapeHtml(headline.title)}</h3>
      <p style="margin:0 0 10px;font-size:15px;color:#374151;line-height:1.55;">${escapeHtml(headline.summary)}</p>
      ${
        perspectives
          ? `<div style="margin:10px 0 0;padding:10px 14px;background:#f8fafc;border-radius:6px;">${perspectives}</div>`
          : ""
      }
      ${renderUrlPills(headline.urls)}
      ${renderSourceLinks(headline.postIds)}
    </div>
  `;
}

function renderSection(title: string, headlines: DigestHeadline[]): string {
  if (headlines.length === 0) return "";

  return `
    <div style="margin-bottom:32px;">
      <div style="margin:0 0 16px;">
        <span style="font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#2563eb;">${title}</span>
        <div style="margin-top:6px;height:1px;background:#e5e7eb;"></div>
      </div>
      ${headlines.map(renderHeadline).join("")}
    </div>
  `;
}

export function renderDigestEmail(digest: Digest, userName: string): string {
  const date = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const bigStoryHtml = digest.bigStory
    ? `
      <div style="margin-bottom:32px;">
        <div style="margin:0 0 14px;">
          <span style="font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#2563eb;">TOP STORY</span>
          <div style="margin-top:6px;height:1px;background:#e5e7eb;"></div>
        </div>
        <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;line-height:1.25;">${escapeHtml(digest.bigStory.title)}</h2>
        <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.55;">${escapeHtml(digest.bigStory.summary)}</p>
        ${
          (digest.bigStory.perspectives || []).length > 0
            ? `<div style="padding:10px 14px;background:#f8fafc;border-radius:6px;margin-bottom:10px;">${(digest.bigStory.perspectives || [])
                .map(renderPerspective)
                .join("")}</div>`
            : ""
        }
        ${renderUrlPills(digest.bigStory.urls || [])}
        ${renderSourceLinks(digest.bigStory.postIds || [])}
      </div>
    `
    : "";

  const professionalPulseHtml = renderSection(
    "PROFESSIONAL PULSE",
    digest.professionalPulse
  );

  const xFactorHtml = renderSection("X-FACTOR", digest.xFactor);

  // Collect all link-out URLs
  const allUrls = new Set<string>();
  if (digest.bigStory) (digest.bigStory.urls || []).forEach((u) => allUrls.add(u));
  (digest.professionalPulse || []).forEach((h) =>
    (h.urls || []).forEach((u) => allUrls.add(u))
  );
  (digest.xFactor || []).forEach((h) => (h.urls || []).forEach((u) => allUrls.add(u)));

  const furtherReadingHtml =
    allUrls.size > 0
      ? `
      <div style="margin-bottom:24px;">
        <div style="margin:0 0 14px;">
          <span style="font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#2563eb;">FURTHER READING</span>
          <div style="margin-top:6px;height:1px;background:#e5e7eb;"></div>
        </div>
        ${Array.from(allUrls)
          .map((url) => ({ href: safeHref(url), url }))
          .filter((u) => u.href)
          .map(
            ({ href, url }) =>
              `<div style="margin-bottom:8px;"><a href="${href}" style="color:#2563eb;text-decoration:none;font-size:14px;font-weight:500;">${formatUrlDisplay(url)}&nbsp;&#8599;</a></div>`
          )
          .join("")}
      </div>
    `
      : "";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Briefly - Your Daily Digest</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:580px;margin:0 auto;padding:24px 16px;">

    <!-- Header -->
    <div style="background:#ffffff;border-radius:8px 8px 0 0;padding:28px 24px 20px;text-align:center;">
      <h1 style="margin:0;font-size:26px;font-weight:800;color:#111827;letter-spacing:-0.5px;">Briefly</h1>
      <div style="margin:10px auto 0;width:40px;height:3px;background:#2563eb;border-radius:2px;"></div>
      <p style="margin:12px 0 0;font-size:13px;color:#9ca3af;font-weight:400;">${date}</p>
    </div>

    <!-- Body -->
    <div style="background:#ffffff;padding:28px 24px 8px;border-radius:0 0 8px 8px;border-top:1px solid #f3f4f6;">
      <p style="margin:0 0 28px;font-size:15px;color:#6b7280;">
        Good morning${userName ? `, ${escapeHtml(userName)}` : ""}. Here&rsquo;s what matters today.
      </p>

      ${bigStoryHtml}
      ${professionalPulseHtml}
      ${xFactorHtml}
      ${furtherReadingHtml}

      ${
        !digest.bigStory &&
        digest.professionalPulse.length === 0 &&
        digest.xFactor.length === 0
          ? `
      <div style="background:#f9fafb;border-radius:8px;padding:24px;text-align:center;margin-bottom:24px;">
        <p style="margin:0;font-size:14px;color:#9ca3af;">
          No significant stories found in your feed today. Check back tomorrow for your next digest.
        </p>
      </div>
      `
          : ""
      }

      <!-- Footer -->
      <div style="border-top:1px solid #f3f4f6;padding-top:16px;margin-top:20px;text-align:center;">
        <p style="margin:0 0 8px;font-size:11px;color:#d1d5db;">
          Curated by Briefly &mdash; your AI-powered news digest.
        </p>
        <a href="{{FLAG_URL}}" style="font-size:11px;color:#9ca3af;text-decoration:none;">Something look wrong? Flag an issue</a>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}
