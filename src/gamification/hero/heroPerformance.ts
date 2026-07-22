/** Marcas DEV-only para medir API / chunk / assets / mount (sem logs em produção). */

const PREFIX = 'lh-hero-perf';

export function heroPerfMark(label: string, detail?: string): void {
  if (!import.meta.env.DEV || typeof performance === 'undefined') return;
  const name = detail ? `${PREFIX}:${label}:${detail}` : `${PREFIX}:${label}`;
  try {
    performance.mark(name);
  } catch {
    // ignore quota / duplicate
  }
}

export function heroPerfMeasure(span: string, start: string, end: string): void {
  if (!import.meta.env.DEV || typeof performance === 'undefined') return;
  try {
    performance.measure(`${PREFIX}:${span}`, start, end);
  } catch {
    // marks may be missing
  }
}

export function heroPerfMeasureSinceRecordResolved(heroKey: string): void {
  heroPerfMeasure(
    'bundle-after-record',
    `lh-hero-perf:record-resolved:${heroKey}`,
    `lh-hero-perf:import-ready:${heroKey}`,
  );
}

/** DEV: inspecionar no console — performance.getEntriesByType('measure').filter(m => m.name.startsWith('lh-hero-perf')) */
export function getHeroPerfEntriesForDev(): PerformanceEntry[] {
  if (!import.meta.env.DEV || typeof performance === 'undefined') return [];
  return performance.getEntriesByType('mark').filter((e) => e.name.startsWith(PREFIX));
}
