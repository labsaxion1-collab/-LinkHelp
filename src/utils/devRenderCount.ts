/** Contagem de renders — DEV/test only; não usar em Production. */

const counts = new Map<string, number>();

export function resetDevRenderCounts(): void {
  counts.clear();
}

export function getDevRenderCount(label: string): number {
  return counts.get(label) ?? 0;
}

export function getDevRenderCountsSnapshot(): Record<string, number> {
  return Object.fromEntries(counts.entries());
}

/** Incrementa contador a cada render do componente que chama o hook. */
export function useDevRenderCount(label: string): void {
  if (import.meta.env.PROD) return;
  counts.set(label, (counts.get(label) ?? 0) + 1);
}
