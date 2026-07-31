/**
 * P3.2 — enriched description + compact public profile inside feed card.
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getHelperLeadCreditQuote } from '@/utils/helperLeadCreditQuote';
import { getApplicationCreditQuote } from '@/utils/helperOpportunityApply';
import { resolveMessage } from '@/services/translationService';
import { en } from '@/translations/en';
import { pt } from '@/translations/pt';
import { fr } from '@/translations/fr';

const cardPath = 'src/components/opportunities/HelperOpportunityCard.tsx';
const profilePath = 'src/components/opportunities/FeedCardClientProfilePanel.tsx';
const extrasPath = 'src/hooks/usePublicProfileExtras.ts';
const dashPath = 'src/pages/helper/HelperDashboard.tsx';
const prefsPath = 'src/utils/helperCategoryPreferences.ts';

const sampleJob = {
  id: 'j1',
  clientId: 'c1',
  clientName: 'Alex',
  clientAvatar: '',
  title: 'Clean apartment',
  category: 'cleaning',
  description: 'Full clean',
  date: 'Today',
  location: 'Montreal',
  value: 'CAD $80',
  budgetMin: 60,
  budgetMax: 100,
  urgency: 'normal' as const,
  status: 'open' as const,
  createdAt: Date.now(),
};

describe('P3.2 feed card description + compact profile', () => {
  it('1–7. description shows meta + real LC quote (no hardcodes / no debit on open)', async () => {
    const src = await readFile(resolve(cardPath), 'utf8');
    expect(src).toContain('feed_card_budget');
    expect(src).toContain('feed_card_distance');
    expect(src).toContain('feed_card_schedule');
    expect(src).toContain('feed_card_no_description');
    expect(src).toContain('getApplicationCreditQuote');
    expect(src).toContain('creditQuote.normalApplyLc');
    expect(src).toContain('creditQuote.normalHireRemainderLc');
    expect(src).toContain('creditQuote.fullRequestLc');
    expect(src).toContain('creditQuote.vipApplyLc');
    expect(src).toContain('feed_card_vip_no_hire_charge');
    expect(src).toContain("goToView('description')");
    expect(src).not.toMatch(/helper_debit|debit_application|confirm_stripe/);
    expect(src).not.toMatch(/split_normal_cost_now',\s*\{\s*count:\s*\d+/);
    expect(src).not.toMatch(/vipApplyLc:\s*\d+/);

    const quote = getApplicationCreditQuote(sampleJob, 8);
    const quote2 = getHelperLeadCreditQuote(sampleJob, { distanceKm: 8 });
    expect(quote.normalApplyLc).toBe(quote2.normalApplyLc);
    expect(quote.vipApplyLc).toBe(quote2.vipApplyLc);
    expect(quote.normalHireRemainderLc).toBe(quote2.normalHireRemainderLc);
  });

  it('8–10. profile is real compact public content; privacy-safe', async () => {
    const src = await readFile(resolve(cardPath), 'utf8');
    const profile = await readFile(resolve(profilePath), 'utf8');
    const extras = await readFile(resolve(extrasPath), 'utf8');
    expect(src).toContain('FeedCardClientProfilePanel');
    expect(src).toContain('data-testid="feed-card-profile-view"');
    expect(src).not.toContain('feed-card-profile-placeholder');
    expect(profile).toContain('usePublicProfileExtras');
    expect(profile).toContain('usePublicReputationDossier');
    expect(profile).toContain('LinkHelpRankBadge');
    expect(profile).toContain('data-testid="feed-card-profile-content"');
    expect(extras).toContain('spoken_languages, bio, city, region');
    expect(extras).toContain("Does not select email, phone, street address, postal, or coordinates");
    const selectMatch = extras.match(/\.select\(\s*'([^']+)'/);
    expect(selectMatch?.[1] ?? '').not.toMatch(/phone|email|postal|lat|lng|street|address_line/);
    expect(profile).not.toMatch(/\bprofile\.phone\b|\bauthEmail\b|\bpostal_code\b|\blatitude\b|\blongitude\b/);
  });

  it('11–15. Voltar + fixed height + internal scroll preserved', async () => {
    const src = await readFile(resolve(cardPath), 'utf8');
    const theme = await readFile(
      resolve('src/components/opportunities/feedCardPremiumTheme.ts'),
      'utf8',
    );
    expect(src).toContain('goBackToSummary');
    expect(src).toContain('data-testid="feed-card-back"');
    expect(src).toContain('data-feed-card-height-locked');
    expect(src).toContain('FEED_CARD_STANDARD_CONTENT_HEIGHT_PX');
    expect(src).toContain('FEED_CARD_PREMIUM_SCROLL_CLASS');
    expect(theme).toContain('overflow-y-auto');
    expect(theme).toContain('overscroll-contain');
    expect(src).toContain('FEED_CARD_PREMIUM_SHELL_CLASS');
    expect(theme).toContain('absolute inset-0');
  });

  it('16. PT/EN/FR feed card copy', () => {
    expect(resolveMessage({ en, pt, fr }, 'pt', 'helper_dashboard.feed_card_no_description')).toBe(
      'Cliente não informou detalhes adicionais.',
    );
    expect(resolveMessage({ en, pt, fr }, 'en', 'helper_dashboard.feed_card_details_title')).toBe(
      'Request details',
    );
    expect(resolveMessage({ en, pt, fr }, 'fr', 'helper_dashboard.feed_card_profile_title')).toBe(
      'Profil',
    );
    expect(resolveMessage({ en, pt, fr }, 'pt', 'helper_dashboard.feed_card_vip_no_hire_charge')).toContain(
      'contratação',
    );
  });

  it('17. feed matching / candidatura helpers unchanged', async () => {
    const dash = await readFile(resolve(dashPath), 'utf8');
    const prefs = await readFile(resolve(prefsPath), 'utf8');
    expect(dash).toContain('getHelperCategoryPreferences');
    expect(dash).toContain('HelperOpportunityCard');
    expect(prefs).toContain('filterToPreferredCategoriesIfPossible');
    expect(prefs).toContain('sortJobsByHelperCategoryPreference');
  });
});
