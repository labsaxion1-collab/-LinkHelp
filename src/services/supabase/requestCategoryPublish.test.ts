import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { remoteCreateRequest } from './appDataRemote';
import { REQUEST_CATEGORY_GROUPS, getRequestGroupCategories } from '@/data/requestCategoryGroups';
import { requestRowToJob } from './mappers';
import { explainHelperFeedJobExclusion } from '@/utils/helperFeedEligibility';
import { getHelperCategoryPreferences } from '@/utils/helperCategoryPreferences';
import type { RequestRow } from '@/types/database';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), baseline: true }));
vi.mock('@/lib/supabase', () => ({ getSupabase: () => ({ rpc: mocks.rpc }) }));
vi.mock('@/config/baselineFinance', async (original) => ({ ...await original<object>(), isBaselineFinanceEnabled: () => mocks.baseline }));
const input = { clientId: 'untrusted-client', category: 'assembly', subcategory: 'ikea', title: 'assembly:ikea',
  description: 'Details', urgency: 'normal', location: 'Montreal', dateLabel: '', budgetHint: '150–220', serviceMode: 'in_person' as const };
beforeEach(() => { mocks.rpc.mockReset().mockResolvedValue({ data: { request_id: 'saved', balance_after: 9 }, error: null }); mocks.baseline = true; });
describe('existing publication pipeline with grouped choices', () => {
  it('sends every one of the 78 original service pairs through the same RPC', async () => {
    for (const group of REQUEST_CATEGORY_GROUPS) for (const category of getRequestGroupCategories(group.id)) for (const subcategory of category.subKeys) {
      await remoteCreateRequest({ ...input, category: category.id, subcategory });
      const [name, args] = mocks.rpc.mock.lastCall!;
      expect(name).toBe('client_publish_request');
      expect(args.p_request).toMatchObject({ category: category.id, subcategory });
      expect(args.p_request).not.toHaveProperty('client_id');
      expect(args.p_request).not.toHaveProperty('status');
      expect(args.p_request).not.toHaveProperty('displayGroup');
    }
    expect(mocks.rpc).toHaveBeenCalledTimes(78);
  });
  it('preserves category and custom other description in legacy-column retry', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: 'column "budget_min" does not exist 42703' } });
    await remoteCreateRequest({ ...input, category: 'other', subcategory: 'other', description: 'Details\n\nTipo de ajuda: Organizar livros' });
    expect(mocks.rpc).toHaveBeenLastCalledWith('client_publish_request', expect.objectContaining({
      p_extended: false, p_request: expect.objectContaining({ category: 'other', subcategory: 'other', description: 'Details\n\nTipo de ajuda: Organizar livros' }),
    }));
  });
  it.each(['AUTH_REQUIRED', 'CLIENT_ONLY', 'INVALID_REQUEST', 'SERVICE_MODE_POLICY_MISSING', 'SERVICE_MODE_NOT_ALLOWED'])('propagates server rejection %s without an alternate insert', async message => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message } });
    await expect(remoteCreateRequest(input)).rejects.toMatchObject({ message });
    expect(mocks.rpc).toHaveBeenCalledOnce();
  });
  it('omits service_mode on historical deployment', async () => {
    mocks.baseline = false;
    await remoteCreateRequest(input);
    expect(mocks.rpc.mock.lastCall![1].p_request).not.toHaveProperty('service_mode');
  });
  it('maps a published row into the existing Helper feed without a display group', async () => {
    await remoteCreateRequest(input);
    const payload = mocks.rpc.mock.lastCall![1].p_request;
    const job = requestRowToJob({ ...payload, id: 'saved', client_id: 'client', status: 'open', created_at: '2026-09-23' } as RequestRow, { id: 'client', name: 'Client', avatar_url: null });
    expect(explainHelperFeedJobExclusion({ job, viewerId: 'helper', prefs: getHelperCategoryPreferences({}, ['assembly:ikea']),
      skillIds: ['assembly:ikea'], selectedCategoryFilters: ['assembly'], dismissedJobIds: new Set(), engagedJobIds: new Set(), applications: [] })).toBe('kept');
  });
  it('retains SQL ownership, client-role, balance and service-policy gates (static contract)', async () => {
    const legacy = await readFile('supabase/apply_client_publish_request_debit.sql', 'utf8');
    const baseline = await readFile('supabase/baseline_drafts/staging/packs/40_pricing_authoritative.sql', 'utf8');
    for (const sql of [legacy, baseline]) {
      expect(sql).toContain('auth.uid()');
      expect(sql).toContain('AUTH_REQUIRED');
      expect(sql).toContain('CLIENT_ONLY');
      expect(sql).toContain('INSUFFICIENT_CLIENT_CREDITS');
    }
    expect(baseline).toContain('lead_validate_service_mode(v_category, v_subcategory, v_mode)');
  });
});
