/**
 * Límite en memoria por IP (prototipo). En serverless usar Redis / edge rate limit.
 */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 120;

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function prune(now: number) {
  if (buckets.size < 500) return;
  for (const [ip, b] of buckets) {
    if (now > b.resetAt) buckets.delete(ip);
  }
}

export function allowWebhookRequest(ip: string): boolean {
  const now = Date.now();
  prune(now);
  let b = buckets.get(ip);
  if (!b || now > b.resetAt) {
    b = { count: 1, resetAt: now + WINDOW_MS };
    buckets.set(ip, b);
    return true;
  }
  if (b.count >= MAX_PER_WINDOW) return false;
  b.count += 1;
  return true;
}
