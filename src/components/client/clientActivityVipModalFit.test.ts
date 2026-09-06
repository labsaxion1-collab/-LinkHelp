import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  LH_CENTERED_MODAL_FIT_PANEL_CLASS,
  LH_CENTERED_MODAL_MAX_HEIGHT_CLASS,
  LH_CENTERED_MODAL_MIN_HEIGHT_CLASS,
} from '@/components/design-system/lhCenteredModalScale';

function resolveMessage(
  packs: { en: string; pt: string; fr: string },
  lang: 'en' | 'pt' | 'fr',
  key: string,
): string {
  const src = packs[lang];
  const leaf = key.split('.').pop()!;
  const re = new RegExp(`${leaf}:\\s*([\\'\\"])([\\s\\S]*?)\\1`);
  const m = src.match(re);
  return m?.[2]?.replace(/\\n/g, '\n') ?? '';
}

describe('VIP decision modal — fit without inner scroll', () => {
  it('fit panel has max-height but no forced min-height', () => {
    expect(LH_CENTERED_MODAL_FIT_PANEL_CLASS).toContain(LH_CENTERED_MODAL_MAX_HEIGHT_CLASS);
    expect(LH_CENTERED_MODAL_FIT_PANEL_CLASS).not.toContain(LH_CENTERED_MODAL_MIN_HEIGHT_CLASS);
  });

  it('VIP overlay uses fit size, elevated layer, and fallback body scroll', async () => {
    const src = await readFile(
      resolve('src/components/client/ClientActivityOpenRequestCard.tsx'),
      'utf8',
    );
    const overlay = await readFile(
      resolve('src/components/design-system/LhCardOverlay.tsx'),
      'utf8',
    );
    expect(src).toContain("size={exclusiveApp ? 'fit' : 'standard'}");
    expect(src).toContain("bodyScroll={exclusiveApp ? 'fallback' : 'always'}");
    expect(src).toContain('layer="elevated"');
    expect(src).toContain('data-vip-layout="fit-no-inner-scroll"');
    expect(overlay).toContain('LH_CENTERED_MODAL_FIT_PANEL_CLASS');
    expect(overlay).toContain("size = 'standard'");
    expect(overlay).toContain("bodyScroll = 'always'");
    expect(overlay).toContain('z-[1000]');
    expect(overlay).toContain('safe-area-inset-top');
    expect(overlay).toContain('safe-area-inset-bottom');
  });

  it('VIP panel shows essentials without premium inner scroll shell', async () => {
    const src = await readFile(
      resolve('src/components/client/ClientActivityOpenRequestCard.tsx'),
      'utf8',
    );
    const start = src.indexOf('const renderVipDecisionPanel');
    const end = src.indexOf('const renderCandidatesContent');
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const vipBlock = src.slice(start, end);
    expect(vipBlock).toContain('data-vip-layout="fit-no-inner-scroll"');
    expect(vipBlock).toContain('client-activity-vip-panel');
    expect(vipBlock).toContain('client-activity-vip-avatar');
    expect(vipBlock).toContain('vip_candidate_label');
    expect(vipBlock).toContain('LinkHelpRankBadgeFromStats');
    expect(vipBlock).toContain('showLabel');
    expect(vipBlock).toContain('client-activity-vip-trust-chips');
    expect(vipBlock).toContain('client-activity-vip-proposal-chips');
    expect(vipBlock).toContain('line-clamp-2');
    expect(vipBlock).toContain('client-activity-vip-open-profile');
    expect(vipBlock).toContain('client-activity-vip-accept');
    expect(vipBlock).toContain('client-activity-vip-reject');
    expect(vipBlock).toContain('accept_application_cta');
    expect(vipBlock).toContain('reject_helper');
    expect(vipBlock).toContain('env(safe-area-inset-bottom)');
    expect(vipBlock).toContain('[@media(max-height:640px)]');
    expect(vipBlock).toContain('[@media(max-height:568px)]');
    expect(vipBlock).toContain('[@media(max-height:667px)]');
    expect(vipBlock).toContain('[@media(min-height:740px)]:flex-row');
    // No tall centered crown stack / duplicate rank text / inner premium scroll.
    expect(vipBlock).not.toContain('flex-col items-center');
    expect(vipBlock).not.toContain('ranking.helper.');
    expect(vipBlock).not.toContain('FEED_CARD_PREMIUM_SCROLL_CLASS');
    expect(vipBlock).not.toContain('FEED_CARD_PREMIUM_SHELL_CLASS');
    expect(vipBlock).not.toContain('max-h-[min(70vh,32rem)]');
    expect(vipBlock).not.toContain('pt-6');
    expect(vipBlock).not.toContain('h-14 w-14');
  });

  it('VIP accept/reject reuse confirm keys and open profile via overlay', async () => {
    const src = await readFile(
      resolve('src/components/client/ClientActivityOpenRequestCard.tsx'),
      'utf8',
    );
    expect(src).toContain('accept_confirm_hire');
    expect(src).toContain('reject_confirm_vip');
    expect(src).toContain('openProfile(app.id)');
    expect(src).toContain('setOverlay(\'profile\')');
    expect(src).not.toContain('embedProfile');
  });

  it('exposes accept/reject VIP copy in PT EN FR', async () => {
    const en = await readFile(resolve('src/translations/en/index.ts'), 'utf8');
    const pt = await readFile(resolve('src/translations/pt/index.ts'), 'utf8');
    const fr = await readFile(resolve('src/translations/fr/index.ts'), 'utf8');
    const packs = { en, pt, fr };
    expect(resolveMessage(packs, 'pt', 'client_dashboard.accept_application_cta')).toBe(
      'Aceitar candidatura',
    );
    expect(resolveMessage(packs, 'en', 'client_dashboard.accept_application_cta')).toBe(
      'Accept application',
    );
    expect(resolveMessage(packs, 'fr', 'client_dashboard.accept_application_cta')).toBe(
      'Accepter la candidature',
    );
    expect(resolveMessage(packs, 'pt', 'client_dashboard.accept_confirm_hire')).toContain(
      '{{name}}',
    );
    expect(resolveMessage(packs, 'pt', 'client_dashboard.accept_confirm_hire')).toContain(
      '{{amount}}',
    );
    expect(pt).toMatch(/reject_confirm_vip:[\s\S]*?candidaturas normais/);
    expect(en).toMatch(/reject_confirm_vip:[\s\S]*?normal applications/);
    expect(fr).toMatch(/reject_confirm_vip:[\s\S]*?candidatures normales/);
  });
});
