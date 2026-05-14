/** Simple async retry with linear backoff (ms). */
export async function withRetry<T>(fn: () => Promise<T>, options?: { retries?: number; baseDelayMs?: number }): Promise<T> {
  const retries = options?.retries ?? 3;
  const base = options?.baseDelayMs ?? 400;
  let last: unknown;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (i < retries - 1) {
        await new Promise((r) => setTimeout(r, base * (i + 1)));
      }
    }
  }
  throw last;
}
