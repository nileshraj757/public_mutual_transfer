// Lightweight in-memory sliding-window rate limiter. Free, no external store.
// Note: serverless instances don't share memory, so this is a best-effort
// deterrent against scraping/abuse (as required), layered on top of RLS and
// Supabase Auth's own built-in rate limits. For strict global limits, back this
// with a shared store; the interface stays the same.

interface Bucket {
  hits: number[];
}

const buckets = new Map<string, Bucket>();

export interface RateResult {
  ok: boolean;
  remaining: number;
  retryAfterMs: number;
}

/**
 * @param key      unique key (e.g. `messages:<userId>`)
 * @param limit    max events per window
 * @param windowMs window size in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateResult {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);

  if (bucket.hits.length >= limit) {
    const retryAfterMs = windowMs - (now - bucket.hits[0]);
    buckets.set(key, bucket);
    return { ok: false, remaining: 0, retryAfterMs };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);
  return { ok: true, remaining: limit - bucket.hits.length, retryAfterMs: 0 };
}
