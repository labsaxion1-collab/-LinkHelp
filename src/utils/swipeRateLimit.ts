const WINDOW_MS = 60_000;
const MAX_INTERESTS = 12;

const interestTimestamps: number[] = [];

export type SwipeRateLimitResult = { allowed: true } | { allowed: false; retryAfterMs: number };

export function checkSwipeInterestRateLimit(now = Date.now()): SwipeRateLimitResult {
  while (interestTimestamps.length > 0 && now - interestTimestamps[0] > WINDOW_MS) {
    interestTimestamps.shift();
  }
  if (interestTimestamps.length >= MAX_INTERESTS) {
    const retryAfterMs = WINDOW_MS - (now - interestTimestamps[0]);
    return { allowed: false, retryAfterMs: Math.max(1000, retryAfterMs) };
  }
  interestTimestamps.push(now);
  return { allowed: true };
}

export function isSwipeRateLimited(): boolean {
  const now = Date.now();
  while (interestTimestamps.length > 0 && now - interestTimestamps[0] > WINDOW_MS) {
    interestTimestamps.shift();
  }
  return interestTimestamps.length >= MAX_INTERESTS;
}
