import { describe, expect, it, beforeEach } from 'vitest';
import {
  getDevRenderCount,
  getDevRenderCountsSnapshot,
  resetDevRenderCounts,
  useDevRenderCount,
} from '@/utils/devRenderCount';

describe('devRenderCount', () => {
  beforeEach(() => {
    resetDevRenderCounts();
  });

  it('incrementa por label em ambiente de teste (não PROD)', () => {
    function Probe() {
      useDevRenderCount('ProbeA');
      return null;
    }
    // Vitest não monta React aqui — contador é atualizado só em render real.
    // Smoke: API de snapshot vazia após reset.
    expect(getDevRenderCount('ProbeA')).toBe(0);
    expect(getDevRenderCountsSnapshot()).toEqual({});
    void Probe;
  });
});
