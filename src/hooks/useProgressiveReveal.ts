import { useEffect, useState } from 'react';
import { scheduleIdle } from '@/utils/scheduleIdle';

/**
 * First paint shows only `initialCount` items; the rest reveal after idle.
 * Avoids mounting long lists on the first frame.
 */
export function useProgressiveReveal<T>(items: T[], initialCount = 3, idleTimeoutMs = 700): T[] {
  const [revealAll, setRevealAll] = useState(false);

  useEffect(() => {
    if (items.length <= initialCount) {
      setRevealAll(true);
      return;
    }
    setRevealAll(false);
    return scheduleIdle(() => setRevealAll(true), idleTimeoutMs);
  }, [items.length, initialCount, idleTimeoutMs]);

  if (revealAll || items.length <= initialCount) return items;
  return items.slice(0, initialCount);
}
