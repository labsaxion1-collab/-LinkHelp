import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  resolveReviewTargetUserType,
  triggerGamificationRecalculate,
} from '@/gamification/services/triggerGamificationRecalculate';

const requestGamificationRecalculate = vi.fn();

vi.mock('@/lib/supabase', () => ({
  getSupabase: vi.fn(() => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'user-1' } } },
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { role: 'client' }, error: null }),
    })),
  })),
}));

vi.mock('@/gamification/services/gamificationApiClient', () => ({
  requestGamificationRecalculate: (...args: unknown[]) => requestGamificationRecalculate(...args),
}));

describe('triggerGamificationRecalculate', () => {
  beforeEach(() => {
    requestGamificationRecalculate.mockReset();
    requestGamificationRecalculate.mockResolvedValue(null);
  });

  it('chama POST /api/gamification/recalculate via requestGamificationRecalculate', async () => {
    triggerGamificationRecalculate('request_published', 'client');
    await vi.waitFor(() => expect(requestGamificationRecalculate).toHaveBeenCalledWith('client'));
  });

  it('não propaga erro quando o recálculo falha', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    requestGamificationRecalculate.mockRejectedValue(new Error('RECALCULATE_FAILED'));

    triggerGamificationRecalculate('application_submitted', 'helper');
    await vi.waitFor(() => expect(warnSpy).toHaveBeenCalled());

    warnSpy.mockRestore();
  });

  it('resolveReviewTargetUserType mapeia reviewer → alvo', () => {
    expect(resolveReviewTargetUserType('client')).toBe('helper');
    expect(resolveReviewTargetUserType('helper')).toBe('client');
  });
});

describe('integração — eventos disparam recálculo', () => {
  it('publicar pedido chama recálculo (AppDataContext)', async () => {
    const src = await readFile(resolve('src/context/AppDataContext.tsx'), 'utf8');
    expect(src).toContain("triggerGamificationRecalculate('request_published', 'client')");
  });

  it('enviar candidatura chama recálculo (AppDataContext)', async () => {
    const src = await readFile(resolve('src/context/AppDataContext.tsx'), 'utf8');
    expect(src).toContain("triggerGamificationRecalculate('application_submitted', 'helper')");
  });

  it('concluir serviço chama recálculo (AppDataContext)', async () => {
    const src = await readFile(resolve('src/context/AppDataContext.tsx'), 'utf8');
    expect(src).toContain("triggerGamificationRecalculate('service_completed'");
  });

  it('avaliação chama recálculo do avaliado (AppDataContext)', async () => {
    const src = await readFile(resolve('src/context/AppDataContext.tsx'), 'utf8');
    expect(src).toContain('triggerGamificationRecalculate(');
    expect(src).toContain("'review_received'");
    expect(src).toContain('resolveReviewTargetUserType(input.reviewerRole)');
  });

  it('atualizar perfil chama recálculo (AuthContext)', async () => {
    const src = await readFile(resolve('src/context/AuthContext.tsx'), 'utf8');
    expect(src).toContain("triggerGamificationRecalculate('profile_updated'");
  });

  it('mensagem respondida chama recálculo (useSupabaseMessages)', async () => {
    const src = await readFile(resolve('src/hooks/useSupabaseMessages.ts'), 'utf8');
    expect(src).toContain("triggerGamificationRecalculate('message_responded'");
  });

  it('pedido cancelado chama recálculo (AppDataContext)', async () => {
    const src = await readFile(resolve('src/context/AppDataContext.tsx'), 'utf8');
    expect(src).toContain("triggerGamificationRecalculate('request_cancelled', 'client')");
  });
});
