import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { gamificationLevelLabelKey, translateGamificationLevelName } from '@/utils/gamificationLevelI18n';
import {
  filterClientJobsForActivityTab,
  isCompletedActivityJob,
  isInProgressActivityJob,
  isWaitingActivityJob,
} from '@/utils/clientActivityJobTabs';
import type { Job } from '@/types/job';

const tEn = (key: string) => {
  const map: Record<string, string> = {
    'ranking.helper.iniciante': 'Beginner Help',
    'ranking.helper.novo_helper': 'New Help',
    'ranking.client.novo_cliente': 'New client',
    'ranking.client.confiavel': 'Reliable client',
    'ranking.client.vip': 'VIP client',
  };
  return map[key] ?? key;
};

const tPt = (key: string) => {
  const map: Record<string, string> = {
    'ranking.helper.iniciante': 'Help iniciante',
    'ranking.client.novo_cliente': 'Novo cliente',
  };
  return map[key] ?? key;
};

const tFr = (key: string) => {
  const map: Record<string, string> = {
    'ranking.helper.iniciante': 'Help débutant',
    'ranking.client.novo_cliente': 'Nouveau client',
  };
  return map[key] ?? key;
};

describe('gamificationLevelI18n', () => {
  it('maps helper confiavel to Beginner Help / Help iniciante keys', () => {
    expect(gamificationLevelLabelKey('helper', 'confiavel')).toBe('ranking.helper.iniciante');
    expect(translateGamificationLevelName('helper', 'confiavel', tEn)).toBe('Beginner Help');
    expect(translateGamificationLevelName('helper', 'confiavel', tPt)).toBe('Help iniciante');
    expect(translateGamificationLevelName('helper', 'confiavel', tFr)).toBe('Help débutant');
  });

  it('maps client novo without mixed Level: prefix', () => {
    expect(translateGamificationLevelName('client', 'novo', tEn)).toBe('New client');
    expect(translateGamificationLevelName('client', 'novo', tPt)).toBe('Novo cliente');
    expect(translateGamificationLevelName('client', 'novo', tFr)).toBe('Nouveau client');
  });
});

describe('clientActivityJobTabs', () => {
  const job = (overrides: Partial<Job>): Job =>
    ({
      id: 'j1',
      clientId: 'c1',
      clientName: 'Client',
      clientAvatar: '',
      title: 't',
      category: 'tech',
      description: '',
      date: '',
      location: '',
      value: '',
      urgency: 'normal',
      status: 'open',
      createdAt: 1,
      preferredDate: '2020-01-01',
      ...overrides,
    }) as Job;

  it('excludes legacy preferred-date expiry from waiting (history owns them)', () => {
    const expiredOpen = job({ id: 'open-expired', status: 'open', preferredDate: '2020-01-01' });
    const hidden = new Set<string>();
    expect(isWaitingActivityJob('open')).toBe(true);
    expect(isCompletedActivityJob('open')).toBe(false);
    expect(filterClientJobsForActivityTab([expiredOpen], 'waiting', hidden)).toEqual([]);
  });

  it('keeps open with future expiresAt in waiting despite past preferredDate', () => {
    const keep = job({
      id: 'keep',
      status: 'open',
      preferredDate: '2020-01-01',
      expiresAt: Date.now() + 86_400_000,
    });
    const hidden = new Set<string>();
    expect(filterClientJobsForActivityTab([keep], 'waiting', hidden).map((j) => j.id)).toEqual(['keep']);
  });

  it('excludes explicit status expired from waiting tabs', () => {
    const expired = job({ id: 'st-expired', status: 'expired' });
    const hidden = new Set<string>();
    expect(filterClientJobsForActivityTab([expired], 'waiting', hidden)).toEqual([]);
  });

  it('moves hired jobs to in_progress; completed never stays in activities', () => {
    const waiting = job({ id: 'w', status: 'open', preferredDate: undefined, expiresAt: Date.now() + 1_000 });
    const hired = job({ id: 'h', status: 'in_progress' });
    const done = job({ id: 'd', status: 'completed' });
    const hidden = new Set<string>();
    expect(isInProgressActivityJob('in_progress')).toBe(true);
    expect(filterClientJobsForActivityTab([waiting, hired, done], 'waiting', hidden).map((j) => j.id)).toEqual([
      'w',
    ]);
    expect(
      filterClientJobsForActivityTab([waiting, hired, done], 'in_progress', hidden).map((j) => j.id),
    ).toEqual(['h']);
    expect(isCompletedActivityJob('completed')).toBe(true);
  });
});

describe('FeedCardClientProfilePanel rank i18n', () => {
  it('uses official rank badge without Level: + hardcoded PT name', async () => {
    const src = await readFile(
      resolve('src/components/opportunities/FeedCardClientProfilePanel.tsx'),
      'utf8',
    );
    expect(src).toContain('LinkHelpRankBadge');
    expect(src).toContain('tone="onDark"');
    expect(src).toContain('CLIENT_RANKS');
    expect(src).not.toContain("t('profile_page.public_level')");
    expect(src).not.toContain('getLevelsFor');
    expect(src).not.toContain('levelName');
  });
});

describe('HelperApplyConfirmModal centered shell', () => {
  it('uses centered compact modal for normal and VIP without PremiumResponsiveModal', async () => {
    const src = await readFile(resolve('src/components/modals/HelperApplyConfirmModal.tsx'), 'utf8');
    expect(src).toContain('data-modal-variant="centered-compact"');
    expect(src).toContain('helper-apply-confirm-modal');
    expect(src).toContain('apply_confirm_title_vip');
    expect(src).toContain('apply_confirm_yes_vip');
    expect(src).toContain('LhPremiumCloseButton');
    expect(src).toContain('helper-apply-confirm-close');
    expect(src).toContain('apply_confirm_back');
    expect(src).toContain('LH_CENTERED_MODAL_APPLY_PANEL_CLASS');
    expect(src).toContain('items-center justify-center');
    expect(src).not.toContain('PremiumResponsiveModal');
    expect(src).not.toContain('items-end');
    expect(src).not.toContain('slide-in-from-bottom');
  });
});

describe('HelperOpportunityCard still hosts apply modal on feed', () => {
  it('keeps HelperApplyConfirmModal wiring without separate VIP page', async () => {
    const src = await readFile(
      resolve('src/components/opportunities/HelperOpportunityCard.tsx'),
      'utf8',
    );
    expect(src).toContain('HelperApplyConfirmModal');
    expect(src).toContain('openConfirmWithType');
    expect(src).not.toContain('navigate(.*vip');
  });
});
