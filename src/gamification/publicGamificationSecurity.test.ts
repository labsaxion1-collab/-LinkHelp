import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve('supabase/migrations/0048_public_gamification_profile_rpc.sql'), 'utf8');
const publicHook = readFileSync(resolve('src/gamification/hooks/usePublicGamificationProfile.ts'), 'utf8');
const messagesPage = readFileSync(resolve('src/pages/chat/MessagesPage.tsx'), 'utf8');

describe('public gamification exposure contract', () => {
  it('keeps user_gamification private and does not recreate broad authenticated select', () => {
    expect(migration).toContain('drop policy if exists "user_gamification_select_peers"');
    expect(migration).not.toMatch(/create\s+policy[\s\S]*user_gamification_select_peers/i);
    expect(migration).not.toMatch(/using\s*\(\s*true\s*\)/i);
    expect(migration).not.toMatch(/for\s+select\s+to\s+authenticated[\s\S]*public\.user_gamification/i);
  });

  it('exposes only the public peer medal fields through the RPC', () => {
    expect(migration).toContain('create or replace function public.get_public_gamification_profile');
    expect(migration).toContain('returns table');
    expect(migration).toMatch(/user_id\s+uuid/);
    expect(migration).toMatch(/user_type\s+text/);
    expect(migration).toMatch(/hero_key\s+text/);
    expect(migration).not.toContain('select *');
    expect(migration).not.toMatch(/score_1000|progress_percent|points_to_next_level|missing_requirements|complaint_count|cancel_count|response_rate|credits/i);
  });

  it('uses a constrained security-definer RPC contract', () => {
    expect(migration).toContain('security definer');
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain('from public.user_gamification ug');
    expect(migration).toContain("target_user_type not in ('client', 'helper')");
    expect(migration).toContain("raise exception 'INVALID_USER_TYPE'");
    expect(migration).toContain('limit 1');
    expect(migration).toContain('revoke all on function public.get_public_gamification_profile(uuid, text) from public');
    expect(migration).toContain('revoke all on function public.get_public_gamification_profile(uuid, text) from anon');
    expect(migration).toContain('grant execute on function public.get_public_gamification_profile(uuid, text) to authenticated');
  });

  it('uses a separate public hook and never reads the peer row directly from the browser', () => {
    expect(publicHook).toContain("rpc('get_public_gamification_profile'");
    expect(publicHook).not.toContain("from('user_gamification')");
    expect(publicHook).not.toContain('requestGamificationRecalculate');
    expect(publicHook).not.toContain('select(');
    expect(publicHook).toContain('CACHE_TTL_MS');
    expect(publicHook).toContain('inFlight');
    expect(publicHook).toContain('cancelled');
  });

  it('keeps chat on the public peer flow with visual fallback support', () => {
    expect(messagesPage).toContain('usePublicGamificationHeroKeys');
    expect(messagesPage).not.toContain('usePeerGamificationHeroKeys');
    expect(messagesPage).not.toContain("from('user_gamification')");
    expect(messagesPage).toContain('peerHeroKeys.get');
  });
});
