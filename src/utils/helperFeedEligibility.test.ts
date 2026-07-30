import { describe, expect, it } from 'vitest';
import {
  defaultSkillKeysForServiceCategories,
  togglePublicHelperCategoryDraft,
} from '@/utils/publicHelperCategories';
import {
  explainHelperFeedJobExclusion,
  helperHasFeedCategories,
  jobMatchesHelperCategories,
  resolveHelperEmptyFeedKind,
} from '@/utils/helperFeedEligibility';
import { getHelperCategoryPreferences } from '@/utils/helperCategoryPreferences';
import type { Job } from '@/types/job';
import type { Application } from '@/types/application';
import { CLIENT_ACTIVITY_PANEL_CLASS } from '@/utils/clientActivityCardView';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

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
    expect(src).toContain('measureFeedCardNaturalHeight');
    expect(src).toContain('invisible pointer-events-none');
    expect(src).toContain('FEED_CARD_PREMIUM_SHELL_CLASS');
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
