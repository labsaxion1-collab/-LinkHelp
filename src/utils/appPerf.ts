/** Marcas DEV-only para bootstrap / layout / navegação (sem logs em produção). */

/** Marcas DEV-only para bootstrap / layout / navegação (sem logs em produção). */

const PREFIX = 'lh-app-perf';

export function appPerfMark(label: string, detail?: string): void {
  if (typeof performance === 'undefined') return;
  const debug =
    import.meta.env.DEV ||
    (typeof window !== 'undefined' &&
      (() => {
        try {
          return new URLSearchParams(window.location.search).get('perfDebug') === '1';
        } catch {
          return false;
        }
      })());
  if (!debug) return;
  const name = detail ? `${PREFIX}:${label}:${detail}` : `${PREFIX}:${label}`;
  try {
    performance.mark(name);
  } catch {
    // ignore quota / duplicate
  }
}

export function appPerfMeasure(span: string, start: string, end: string): void {
  if (!import.meta.env.DEV || typeof performance === 'undefined') return;
  const startName = start.startsWith(PREFIX) ? start : `${PREFIX}:${start}`;
  const endName = end.startsWith(PREFIX) ? end : `${PREFIX}:${end}`;
  try {
    performance.measure(`${PREFIX}:${span}`, startName, endName);
  } catch {
    // marks may be missing
  }
}

/** DEV: performance.getEntriesByType('measure').filter(m => m.name.startsWith('lh-app-perf')) */
export function getAppPerfEntriesForDev(): PerformanceEntry[] {
  if (!import.meta.env.DEV || typeof performance === 'undefined') return [];
  return [...performance.getEntriesByType('mark'), ...performance.getEntriesByType('measure')].filter((e) =>
    e.name.startsWith(PREFIX),
  );
}
