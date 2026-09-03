import "server-only";

/**
 * Rate limiting.
 *
 * An in-memory sliding window, deliberately. Upstash would be the right answer
 * for a distributed limit, but it needs credentials this deployment does not
 * have, and a limiter that silently no-ops because an env var is missing is
 * worse than one whose limits are honest about being per-instance.
 *
 * What this means in practice: on serverless the counter is per warm instance,
 * so the effective limit is (limit × instances). That still stops a single
 * client hammering one endpoint, which is what these limits are for. Anything
 * that must be globally exact — billing, quota enforcement — is counted in
 * Postgres instead, not here.
 */

type Window = { hits: number[]; };

const BUCKETS = new Map<string, Window>();

// Bounded so a long-lived instance cannot grow this map without limit.
const MAX_KEYS = 10_000;

export type RateLimitResult = {
  ok: boolean;
  limit: number;
  remaining: number;
  /** Unix seconds when the window frees up. */
  reset: number;
  retryAfter: number;
};

export function rateLimit(
  identifier: string,
  options: { limit: number; windowSeconds: number }
): RateLimitResult {
  const now = Date.now();
  const windowMs = options.windowSeconds * 1000;
  const cutoff = now - windowMs;

  if (BUCKETS.size > MAX_KEYS) BUCKETS.clear();

  const bucket = BUCKETS.get(identifier) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((at) => at > cutoff);

  const allowed = bucket.hits.length < options.limit;
  if (allowed) bucket.hits.push(now);

  BUCKETS.set(identifier, bucket);

  const oldest = bucket.hits[0] ?? now;
  const resetMs = oldest + windowMs;

  return {
    ok: allowed,
    limit: options.limit,
    remaining: Math.max(0, options.limit - bucket.hits.length),
    reset: Math.ceil(resetMs / 1000),
    retryAfter: Math.max(1, Math.ceil((resetMs - now) / 1000)),
  };
}

/** The client IP, as far as the proxy chain can be trusted. */
export function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return (
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function rateLimitHeaders(result: RateLimitResult) {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.reset),
  };
}

export function tooManyRequests(result: RateLimitResult) {
  return Response.json(
    {
      error: `Too many requests. Try again in ${result.retryAfter} seconds.`,
    },
    {
      status: 429,
      headers: {
        ...rateLimitHeaders(result),
        "Retry-After": String(result.retryAfter),
      },
    }
  );
}

/** The limits, in one place so they can be reasoned about together. */
export const LIMITS = {
  register: { limit: 5, windowSeconds: 60 },
  chat: { limit: 10, windowSeconds: 60 },
  signup: { limit: 3, windowSeconds: 3600 },
  login: { limit: 10, windowSeconds: 60 },
  publicApi: { limit: 100, windowSeconds: 60 },
} as const;
