import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  defaultSkillKeysForServiceCategories,
  togglePublicHelperCategoryDraft,
} from '@/utils/publicHelperCategories';
import {
  explainHelperFeedJobExclusion,
  helperHasFeedCategories,
  isHelperFeedRequestActive,
  isRequestExpiredApplyError,
  jobMatchesHelperCategories,
  resolveHelperEmptyFeedKind,
} from '@/utils/helperFeedEligibility';
import { getHelperCategoryPreferences } from '@/utils/helperCategoryPreferences';
import type { Job } from '@/types/job';
import type { Application } from '@/types/application';
import { CLIENT_ACTIVITY_PANEL_CLASS } from '@/utils/clientActivityCardView';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { resolveMessage } from '@/services/translationService';
import { en } from '@/translations/en';
import { pt } from '@/translations/pt';
import { fr } from '@/translations/fr';

const baseJob = (overrides: Partial<Job> = {}): Job =>
  ({
    id: 'job-1',
    clientId: 'client-1',
    title: 'Clean',
    category: 'cleaning',
    status: 'open',
    createdAt: 1,
    urgency: 'normal',
    value: '$50',
    date: '__soon',
    location: 'Montreal',
    ...overrides,
  }) as Job;

describe('public helper multi-category draft', () => {
  it('toggles multiple categories without dropping below one', () => {
    let draft = ['cleaning'] as const;
    const next = togglePublicHelperCategoryDraft([...draft], 'moving');
    expect(next).toEqual(['cleaning', 'moving']);
    expect(togglePublicHelperCategoryDraft(next, 'cleaning')).toEqual(['moving']);
    expect(togglePublicHelperCategoryDraft(['moving'], 'moving')).toEqual(['moving']);
  });

  it('maps service categories to default skill keys for helper_skills sync', () => {
    const keys = defaultSkillKeysForServiceCategories(['cleaning', 'moving']);
    expect(keys.every((k) => k.includes(':'))).toBe(true);
    expect(keys.some((k) => k.startsWith('cleaning:'))).toBe(true);
    expect(keys.some((k) => k.startsWith('moving:'))).toBe(true);
  });
});

describe('helper feed category gate', () => {
  it('treats profile primary/secondary as enough categories without skillIds', () => {
    const prefs = getHelperCategoryPreferences(
      { primary_category: 'cleaning', secondary_categories: ['moving'] },
      [],
    );
    expect(prefs.hasExplicitPreference).toBe(true);
    expect(helperHasFeedCategories([], prefs)).toBe(true);
    expect(helperHasFeedCategories([], getHelperCategoryPreferences(null, []))).toBe(false);
  });

  it('matches open job by primary category after profile preference', () => {
    const prefs = getHelperCategoryPreferences(
      { primary_category: 'cleaning', secondary_categories: [] },
      [],
    );
    expect(jobMatchesHelperCategories(baseJob({ category: 'cleaning' }), prefs)).toBe(true);
    expect(jobMatchesHelperCategories(baseJob({ category: 'tech', id: 'j2' }), prefs)).toBe(false);
  });

  it('explains exclusion reasons for diagnostics', () => {
    const prefs = getHelperCategoryPreferences(
      { primary_category: 'cleaning', secondary_categories: [] },
      ['cleaning:apartment'],
    );
    const apps: Application[] = [];
    expect(
      explainHelperFeedJobExclusion({
        job: baseJob({ category: 'tech' }),
        viewerId: 'helper-1',
        prefs,
        skillIds: ['cleaning:apartment'],
        selectedCategoryFilters: [],
        dismissedJobIds: new Set(),
        engagedJobIds: new Set(),
        applications: apps,
      }),
    ).toBe('category_mismatch');

    expect(
      explainHelperFeedJobExclusion({
        job: baseJob({ clientId: 'helper-1' }),
        viewerId: 'helper-1',
        prefs,
        skillIds: ['cleaning:apartment'],
        selectedCategoryFilters: [],
        dismissedJobIds: new Set(),
        engagedJobIds: new Set(),
        applications: apps,
      }),
    ).toBe('own_job');
  });

  it('classifies empty feed kinds', () => {
    expect(
      resolveHelperEmptyFeedKind({
        skillsLoaded: true,
        hasCategories: false,
        openEligibleBeforeSoftFilters: 3,
        displayedCount: 0,
      }),
    ).toBe('no_categories');
    expect(
      resolveHelperEmptyFeedKind({
        skillsLoaded: true,
        hasCategories: true,
        openEligibleBeforeSoftFilters: 3,
        displayedCount: 0,
      }),
    ).toBe('all_filtered');
    expect(
      resolveHelperEmptyFeedKind({
        skillsLoaded: true,
        hasCategories: true,
        openEligibleBeforeSoftFilters: 0,
        displayedCount: 0,
      }),
    ).toBe('no_open_matches');
  });
});

describe('client activity fixed height wiring', () => {
  it('keeps summary mounted and locks height like feed (no min-h 280 panel)', async () => {
    expect(CLIENT_ACTIVITY_PANEL_CLASS).toContain('h-full');
    expect(CLIENT_ACTIVITY_PANEL_CLASS).not.toContain('min-h-[280px]');
    const src = await readFile(
      resolve('src/components/client/ClientActivityOpenRequestCard.tsx'),
      'utf8',
    );
    expect(src).toContain('feedCardLockedContentStyle');
    expect(src).toContain('LhCardOverlay');
    expect(src).toContain('FEED_CARD_PREMIUM_SHELL_CLASS');
    expect(src).not.toContain('invisible pointer-events-none');
    expect(src).not.toContain('Math.max(natural, 280)');
    expect(src).not.toContain('min-h-[280px]');
    const feed = await readFile(
      resolve('src/components/opportunities/HelperOpportunityCard.tsx'),
      'utf8',
    );
    expect(feed).toContain('InterestedRing');
    expect(feed).not.toContain('ClientActivityOpenRequestCard');
  });
});

describe('public profile category confirm wiring', () => {
  it('keeps picker open until confirm and syncs helper skills', async () => {
    const src = await readFile(resolve('src/pages/profile/PublicProfileEditPage.tsx'), 'utf8');
    expect(src).toContain('confirmCategoryDraft');
    expect(src).toContain('public-edit-confirm-categories');
    expect(src).toContain('toggleCategoryDraft');
    expect(src).toContain('syncHelperSkills');
    expect(src).toContain('defaultSkillKeysForServiceCategories');
    expect(src).toContain('data-picker-category-id');
    expect(src).not.toMatch(/data-picker-category-id[\s\S]{0,120}disabled=\{selected\}/);
    const dash = await readFile(resolve('src/pages/helper/HelperDashboard.tsx'), 'utf8');
    expect(dash).toContain('helperHasFeedCategories');
    expect(dash).toContain('explainHelperFeedJobExclusion');
  });
});

describe('helper feed expiration eligibility', () => {
  const NOW = Date.parse('2026-09-03T18:00:00.000Z');
  const PAST = NOW - 60_000;
  const FUTURE = NOW + 86_400_000;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('1. status expired is not active in the helper feed', () => {
    expect(
      isHelperFeedRequestActive(baseJob({ status: 'expired', expiresAt: null }), 'helper-1', NOW),
    ).toBe(false);
  });

  it('2. open with past expiresAt is excluded from the feed', () => {
    expect(
      isHelperFeedRequestActive(baseJob({ status: 'open', expiresAt: PAST }), 'helper-1', NOW),
    ).toBe(false);
  });

  it('3. open with past preferredDate and future expiresAt stays active', () => {
    expect(
      isHelperFeedRequestActive(
        baseJob({ status: 'open', preferredDate: '2020-01-01', expiresAt: FUTURE }),
        'helper-1',
        NOW,
      ),
    ).toBe(true);
  });

  it('4. legacy open without expiresAt uses preferredDate day-end fallback', () => {
    expect(
      isHelperFeedRequestActive(
        baseJob({ status: 'open', preferredDate: '2020-01-01', expiresAt: null }),
        'helper-1',
        NOW,
      ),
    ).toBe(false);
    expect(
      isHelperFeedRequestActive(
        baseJob({ status: 'open', preferredDate: '2099-01-01', expiresAt: null }),
        'helper-1',
        NOW,
      ),
    ).toBe(true);
  });

  it('5. normal and VIP share the same feed eligibility helper', async () => {
    const dash = await readFile(resolve('src/pages/helper/HelperDashboard.tsx'), 'utf8');
    expect(dash).toContain('isHelperFeedRequestActive');
    expect(dash).toContain('isRequestExpiredApplyError');
    expect(dash).toContain('removeExpiredRequestFromFeed');
    const gateIdx = dash.indexOf('isHelperFeedRequestActive(job, helperUserId');
    expect(gateIdx).toBeGreaterThan(-1);
    expect(dash.indexOf('decideHelperApplyLocation', gateIdx)).toBeGreaterThan(gateIdx);
  });

  it('6. REQUEST_EXPIRED handler removes the card and closes apply UI', async () => {
    const dash = await readFile(resolve('src/pages/helper/HelperDashboard.tsx'), 'utf8');
    expect(dash).toContain("isRequestExpiredApplyError(err)");
    expect(dash).toContain("apply_request_expired");
    expect(dash).toContain('setApplyExpandedJobId(null)');
    expect(dash).toContain('serverExpiredJobIds');
  });

  it('7. REQUEST_EXPIRED is handled before apply debit success path', async () => {
    const dash = await readFile(resolve('src/pages/helper/HelperDashboard.tsx'), 'utf8');
    const catchStart = dash.indexOf('} catch (err: unknown) {');
    const expiredIdx = dash.indexOf('isRequestExpiredApplyError', catchStart);
    const toastErrorIdx = dash.indexOf('showToast(friendlyMsg', catchStart);
    expect(expiredIdx).toBeGreaterThan(catchStart);
    expect(expiredIdx).toBeLessThan(toastErrorIdx);
    expect(isRequestExpiredApplyError(new Error('REQUEST_EXPIRED'))).toBe(true);
    expect(isRequestExpiredApplyError(new Error('OTHER'))).toBe(false);
  });

  it('8. feed clock re-evaluates expired open jobs with fake timers', () => {
    const job = baseJob({ status: 'open', expiresAt: NOW + 1_000 });
    expect(isHelperFeedRequestActive(job, 'helper-1', Date.now())).toBe(true);
    vi.setSystemTime(NOW + 2_000);
    expect(isHelperFeedRequestActive(job, 'helper-1', Date.now())).toBe(false);
  });

  it('9. location GPS confirmation flow remains independent of expiration handling', async () => {
    const dash = await readFile(resolve('src/pages/helper/HelperDashboard.tsx'), 'utf8');
    expect(dash).toContain('decideHelperApplyLocation');
    expect(dash).toContain('storeHelperApplyReturnContext');
    expect(dash).not.toContain('requestHomeBaseGpsCoordinates');
  });

  it('10. client history still receives expired requests via isJobExpired', async () => {
    const history = await readFile(resolve('src/utils/clientHistoryBuckets.ts'), 'utf8');
    expect(history).toContain('isJobExpired');
    expect(history).toContain("status === 'expired'");
    for (const key of ['helper_dashboard.apply_request_expired']) {
      expect(resolveMessage({ en, pt, fr }, 'pt', key).length).toBeGreaterThan(12);
      expect(resolveMessage({ en, pt, fr }, 'en', key).length).toBeGreaterThan(12);
      expect(resolveMessage({ en, pt, fr }, 'fr', key).length).toBeGreaterThan(12);
    }
  });

  it('explainHelperFeedJobExclusion marks expired open jobs as status', () => {
    const prefs = getHelperCategoryPreferences(
      { primary_category: 'cleaning', secondary_categories: [] },
      ['cleaning:apartment'],
    );
    expect(
      explainHelperFeedJobExclusion({
        job: baseJob({ status: 'open', expiresAt: PAST }),
        viewerId: 'helper-1',
        prefs,
        skillIds: ['cleaning:apartment'],
        selectedCategoryFilters: [],
        dismissedJobIds: new Set(),
        engagedJobIds: new Set(),
        applications: [],
      }),
    ).toBe('status');
  });
});
