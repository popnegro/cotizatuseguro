import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const MAX_REQUESTS_PER_WINDOW = 8;
type RateLimitDecision = { success: boolean; reset: number };
type RateLimitCheck = (key: string) => Promise<RateLimitDecision>;
let rateLimiter: Ratelimit | undefined;
let rateLimitOverrideForTests: RateLimitCheck | undefined;

// Test-only dependency seam. This module is not a Next.js route entrypoint.
export function __setRateLimitForTests(override: RateLimitCheck | undefined) {
  rateLimitOverrideForTests = override;
}

function getRateLimiter(): Ratelimit {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("Distributed rate limiter is not configured");
  if (!rateLimiter) {
    rateLimiter = new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(MAX_REQUESTS_PER_WINDOW, "60 s"),
      prefix: "cotizatuseguro:leads",
      analytics: false,
      timeout: 1_500,
      enableProtection: true
    });
  }
  return rateLimiter;
}

export async function checkRateLimit(key: string): Promise<RateLimitDecision> {
  if (rateLimitOverrideForTests) return rateLimitOverrideForTests(key);
  return getRateLimiter().limit(key);
}
