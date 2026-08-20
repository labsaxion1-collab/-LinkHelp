import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  COMPACT_RANK_FULL_BLEED_CLASS,
  LH_CENTERED_MODAL_APPLY_PANEL_CLASS,
  LH_CENTERED_MODAL_MAX_HEIGHT_CLASS,
  LH_CENTERED_MODAL_MIN_HEIGHT_CLASS,
  LH_CENTERED_MODAL_STANDARD_PANEL_CLASS,
  LH_CENTERED_MODAL_WIDTH_CLASS,
} from '@/components/design-system/lhCenteredModalScale';

const root = new URL('../../../', import.meta.url);

function read(rel: string): string {
  return readFileSync(new URL(rel, root), 'utf8');
}

describe('shared centered modal scale', () => {
  it('matches HelperApplyConfirmModal width (calc 100vw - 32px, max 360)', () => {
    expect(LH_CENTERED_MODAL_WIDTH_CLASS).toContain('w-[calc(100vw-32px)]');
    expect(LH_CENTERED_MODAL_WIDTH_CLASS).toContain('max-w-[360px]');
    expect(LH_CENTERED_MODAL_APPLY_PANEL_CLASS).toContain(LH_CENTERED_MODAL_WIDTH_CLASS);
    expect(LH_CENTERED_MODAL_STANDARD_PANEL_CLASS).toContain(LH_CENTERED_MODAL_WIDTH_CLASS);
  });

  it('gives description/profile a useful min-height and 75–85dvh cap', () => {
    expect(LH_CENTERED_MODAL_MIN_HEIGHT_CLASS).toContain('min-h-[min(400px,80dvh)]');
    expect(LH_CENTERED_MODAL_MAX_HEIGHT_CLASS).toContain('max-h-[min(82dvh,720px)]');
    expect(LH_CENTERED_MODAL_STANDARD_PANEL_CLASS).toContain(LH_CENTERED_MODAL_MIN_HEIGHT_CLASS);
    expect(LH_CENTERED_MODAL_STANDARD_PANEL_CLASS).toContain(LH_CENTERED_MODAL_MAX_HEIGHT_CLASS);
  });

  it('apply modal uses width tokens without min-height (content already fills)', () => {
    expect(LH_CENTERED_MODAL_APPLY_PANEL_CLASS).not.toContain(LH_CENTERED_MODAL_MIN_HEIGHT_CLASS);
    const apply = read('src/components/modals/HelperApplyConfirmModal.tsx');
    expect(apply).toContain('LH_CENTERED_MODAL_APPLY_PANEL_CLASS');
    expect(apply).toContain('helper-apply-confirm-modal');
    expect(apply).toContain('apply_confirm_yes_vip');
  });

  it('feed description and profile overlays share the standard panel', () => {
    const overlay = read('src/components/design-system/LhCardOverlay.tsx');
    const card = read('src/components/opportunities/HelperOpportunityCard.tsx');
    const activity = read('src/components/client/ClientActivityOpenRequestCard.tsx');
    const completed = read('src/components/client/ClientCompletedHistoryCard.tsx');
    const helperHistory = read('src/components/helpers/HelperCompletedHistoryCard.tsx');
    expect(overlay).toContain('LH_CENTERED_MODAL_STANDARD_PANEL_CLASS');
    expect(overlay).toContain('overflow-y-auto');
    expect(overlay).toContain('z-[1000]');
    expect(card).toContain('feed-card-description-overlay');
    expect(card).toContain('feed-card-profile-overlay');
    expect(card).not.toContain('maxWidthClass');
    expect(activity).not.toContain('maxWidthClass');
    expect(completed).not.toContain('maxWidthClass');
    expect(helperHistory).not.toContain('maxWidthClass');
  });
});

describe('compact rank full-bleed', () => {
  it('breaks out to viewport width on mobile with safe inner padding', () => {
    expect(COMPACT_RANK_FULL_BLEED_CLASS).toContain('lh-compact-rank-bleed');
    expect(COMPACT_RANK_FULL_BLEED_CLASS).toContain('w-[100dvw]');
    expect(COMPACT_RANK_FULL_BLEED_CLASS).toContain('lg:w-full');
    const presentation = read('src/gamification/components/GamificationRankPresentation.tsx');
    const css = read('src/styles/globals.css');
    const dash = read('src/pages/helper/HelperDashboard.tsx');
    expect(presentation).toContain('COMPACT_RANK_FULL_BLEED_CLASS');
    expect(presentation).toContain('min-h-[170px]');
    expect(presentation).toContain('max-h-[210px]');
    expect(presentation).toContain('px-4');
    expect(css).toContain('.lh-compact-rank-bleed');
    expect(css).toContain('width: 100dvw');
    expect(dash).toContain('overflow-x-hidden');
    expect(dash).not.toContain('px-1 sm:px-0');
  });
});
