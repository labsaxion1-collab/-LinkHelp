/**
 * Defer non-critical work until the browser is idle (or after a short timeout).
 * Returns a cancel function.
 */
export function scheduleIdle(task: () => void, timeoutMs = 1500): () => void {
  if (typeof window === 'undefined') {
    task();
    return () => {};
  }

  const ric = window.requestIdleCallback?.bind(window);
  if (typeof ric === 'function') {
    const id = ric(() => task(), { timeout: timeoutMs });
    return () => window.cancelIdleCallback?.(id);
  }

  const timer = window.setTimeout(task, Math.min(timeoutMs, 400));
  return () => window.clearTimeout(timer);
}
