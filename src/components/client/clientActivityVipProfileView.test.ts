import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('VIP candidate profile view (after Perfil)', () => {
  it('keeps the approved VIP decision card structure unchanged', async () => {
    const src = await readFile(
      resolve('src/components/client/ClientActivityOpenRequestCard.tsx'),
      'utf8',
    );
    const start = src.indexOf('const renderVipDecisionPanel');
    const end = src.indexOf('const renderCandidatesContent');
    const vip = src.slice(start, end);
    expect(vip).toContain('data-vip-layout="fit-no-inner-scroll"');
    expect(vip).toContain('client-activity-vip-open-profile');
    expect(vip).toContain('client-activity-vip-accept');
    expect(vip).toContain('client-activity-vip-reject');
    expect(vip).toContain('accept_application_cta');
    expect(vip).not.toContain('FEED_CARD_PREMIUM_SHELL_CLASS');
    expect(src).toContain('reject_confirm_vip');
    expect(src).toContain('accept_confirm_hire');
  });

  it('opens a light full-bleed profile without dark shell or duplicate identity', async () => {
    const src = await readFile(
      resolve('src/components/client/ClientActivityOpenRequestCard.tsx'),
      'utf8',
    );
    const start = src.indexOf('const renderProfileContent');
    const end = src.indexOf('const candidatesOverlayTitle');
    const profile = src.slice(start, end);

    expect(profile).toContain('client-activity-profile-view');
    expect(profile).toContain('data-profile-surface="light"');
    expect(profile).toContain('data-profile-scroll="vertical"');
    expect(profile).toContain('CandidateHelperProfileExpand');
    expect(profile).toContain('surface="page"');
    expect(profile).toContain('bg-[#F8FAFC]');
    expect(profile).toContain('env(safe-area-inset-bottom)');
    expect(profile).toContain('w-full max-w-none');

    // Dark premium shell + outer identity row removed (no duplicate avatar/name/level).
    expect(profile).not.toContain('FEED_CARD_PREMIUM_SHELL_CLASS');
    expect(profile).not.toContain('FEED_CARD_PREMIUM_SCROLL_CLASS');
    expect(profile).not.toContain('ring-2 ring-white/40');
    expect(profile).not.toContain('text-white');
    expect(profile).not.toContain('LinkHelpRankBadgeFromStats');
    expect(profile).not.toContain('h-11 w-11 rounded-full');

    // Single expand owns identity; no accept/reject on profile page.
    expect(profile).not.toContain('renderActionRow');
    expect(profile).not.toContain('tryAccept');
    expect(profile).not.toContain('tryReject');
  });

  it('profile overlay scrolls vertically, keeps header/back/close, stays above navbar', async () => {
    const src = await readFile(
      resolve('src/components/client/ClientActivityOpenRequestCard.tsx'),
      'utf8',
    );
    const overlay = await readFile(
      resolve('src/components/design-system/LhCardOverlay.tsx'),
      'utf8',
    );
    const expand = await readFile(
      resolve('src/components/client/CandidateHelperProfileExpand.tsx'),
      'utf8',
    );

    expect(src).toContain('client-activity-profile-overlay');
    expect(src).toContain('onBack={backFromProfile}');
    expect(src).toContain('flushBody');
    expect(src).toContain('layer="elevated"');
    expect(src).toContain("bodyScroll=\"always\"");
    expect(src).toContain("size=\"standard\"");
    expect(src).toContain("setOverlay('candidates')");
    expect(src).toContain('closeOverlay');

    expect(overlay).toContain('flushBody');
    expect(overlay).toContain("elevated: 'z-[1000]'");
    expect(overlay).toContain('overflow-y-auto');
    expect(overlay).toContain('overflow-x-hidden');
    expect(overlay).toContain('lh-card-overlay-back-to-candidates');
    expect(overlay).toContain('safe-area-inset-top');
    expect(overlay).toContain('safe-area-inset-bottom');

    expect(expand).toContain("surface === 'page'");
    expect(expand).toContain('candidate-profile-identity');
    expect(expand).toContain('data-profile-surface={surface}');
  });

  it('exposes profile copy keys in PT EN FR', async () => {
    const en = await readFile(resolve('src/translations/en/index.ts'), 'utf8');
    const pt = await readFile(resolve('src/translations/pt/index.ts'), 'utf8');
    const fr = await readFile(resolve('src/translations/fr/index.ts'), 'utf8');
    for (const pack of [en, pt, fr]) {
      expect(pack).toContain('application_type_vip');
      expect(pack).toContain('toggle_label');
      expect(pack).toContain('back_to_candidates');
      expect(pack).toContain('no_reviews_yet');
    }
    expect(pt).toContain("toggle_label:");
    expect(en).toContain("toggle_label:");
    expect(fr).toContain("toggle_label:");
  });

  it('documents compact height/width targets for the light profile page', () => {
    const widths = [240, 280, 300, 360, 390];
    const heights = [568, 640, 667, 740, 800, 844];
    expect(widths).toHaveLength(5);
    expect(heights).toHaveLength(6);
    expect(Math.min(...widths)).toBe(240);
    expect(Math.max(...widths)).toBe(390);
    expect(Math.min(...heights)).toBe(568);
    expect(Math.max(...heights)).toBe(844);
  });
});
