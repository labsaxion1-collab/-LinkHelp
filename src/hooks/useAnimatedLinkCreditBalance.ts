import { useEffect, useState } from 'react';

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * Light balance counter — opacity/transform only; respects reduced motion.
 * Never invents values: shows "…" while loading/null.
 */
export function useAnimatedLinkCreditBalance(
  balance: number | null | undefined,
  loading = false,
): string {
  const [shown, setShown] = useState<number | null>(
    typeof balance === 'number' && Number.isFinite(balance) ? balance : null,
  );

  useEffect(() => {
    if (loading || balance == null || !Number.isFinite(balance)) return;
    const target = Math.max(0, Math.round(balance));
    if (prefersReducedMotion() || shown == null) {
      setShown(target);
      return;
    }
    if (shown === target) return;

    const start = shown;
    const delta = target - start;
    const duration = Math.min(500, 180 + Math.abs(delta) * 12);
    const t0 = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - (1 - p) ** 3;
      setShown(Math.round(start + delta * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [balance, loading, shown]);

  if (loading && shown == null) return '…';
  if (shown == null && (balance == null || loading)) return '…';
  return String(shown ?? Math.max(0, Math.round(balance ?? 0)));
}
