export class RateLimitError extends Error {
  retryAfter: number;

  constructor(retryAfter: number) {
    super(`Rate limited. Retry after ${retryAfter}s`);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

interface FetchWithBackoffOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

export async function fetchWithBackoff(
  url: string,
  init: RequestInit,
  options: FetchWithBackoffOptions = {}
): Promise<Response> {
  const { maxRetries = 5, baseDelayMs = 1000, maxDelayMs = 32000 } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, init);

    if (response.ok) {
      return response;
    }

    // Retry on 429 (rate limit) and 5xx (transient server errors)
    const isRetryable = response.status === 429 || response.status >= 500;

    if (isRetryable && attempt < maxRetries) {
      const retryAfterHeader = response.headers.get("retry-after");
      let delayMs: number;

      if (retryAfterHeader && response.status === 429) {
        delayMs = parseInt(retryAfterHeader, 10) * 1000;
      } else {
        delayMs = Math.min(
          baseDelayMs * Math.pow(2, attempt) + Math.random() * 1000,
          maxDelayMs
        );
      }

      console.log(
        `[RateLimiter] ${response.status} on attempt ${attempt + 1}/${maxRetries + 1}, retrying in ${Math.round(delayMs)}ms`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      continue;
    }

    if (response.status === 429) {
      const retryAfter = parseInt(
        response.headers.get("retry-after") || "60",
        10
      );
      throw new RateLimitError(retryAfter);
    }

    // Non-retryable error
    const errorBody = await response.text();
    throw new Error(
      `API request failed: ${response.status} ${response.statusText} - ${errorBody}`
    );
  }

  throw new Error("Max retries exceeded");
}
