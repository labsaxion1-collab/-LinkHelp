import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  FEED_CARD_CONTENT_CLASS,
  FEED_CARD_RING_SIZE_PX,
  FEED_CARD_SHELL_CLASS,
  FEED_CARD_STANDARD_CONTENT_HEIGHT_PX,
  feedCardMinContentStyle,
} from '@/utils/feedCardFixedHeight';

const root = new URL('../../../', import.meta.url);

function read(rel: string): string {
  return readFileSync(new URL(rel, root), 'utf8');
}

describe('helper activity cards align with feed geometry', () => {
  it('exposes min-height style that can grow for rejected banner', () => {
    expect(feedCardMinContentStyle()).toEqual({
      minHeight: FEED_CARD_STANDARD_CONTENT_HEIGHT_PX,
    });
    expect(feedCardMinContentStyle()).not.toHaveProperty('maxHeight');
  });

  it('HelperApplicationCard reuses feed shell tokens and footer profile+description', () => {
    const src = read('src/components/helpers/HelperApplicationCard.tsx');
    expect(src).toContain('FEED_CARD_SHELL_CLASS');
    expect(src).toContain('FEED_CARD_CONTENT_CLASS');
    expect(src).toContain('FEED_CARD_TOP_ACCENT_CLASS');
    expect(src).toContain('feedCardMinContentStyle');
    expect(src).toContain('FEED_CARD_STANDARD_CONTENT_HEIGHT_PX');
    expect(src).toContain(`size={FEED_CARD_RING_SIZE_PX}`);
    expect(src).toContain('helper-application-open-profile');
    expect(src).toContain('helper-application-open-description');
    expect(src).toContain('LhCardOverlay');
    expect(src).toContain('mt-auto');
    expect(src).not.toContain('helper_tasks.cancel_short');
    expect(src).not.toContain('accordionBtn');
    expect(src).not.toMatch(/descriptionOpen \? \(\s*<div className="overflow-hidden border-t/);
  });

  it('moves cancel into more-menu only when cancelable', () => {
    const src = read('src/components/helpers/HelperApplicationCard.tsx');
    expect(src).toContain('canCancel');
    expect(src).toContain('helper-application-more-menu');
    expect(src).toContain('helper-application-cancel-menu-item');
    expect(src).toContain("t('helper_dashboard.cancel_application')");
    expect(src).toContain('onCancel?.()');
    expect(src).toContain("app.status === 'pending' || app.status === 'viewed'");
    expect(src).toContain('Escape');
  });

  it('rejected state shows explanation without inventing rejection_reason or normal refund', () => {
    const src = read('src/components/helpers/HelperApplicationCard.tsx');
    const pt = read('src/translations/pt/index.ts');
    const en = read('src/translations/en/index.ts');
    const fr = read('src/translations/fr/index.ts');
    expect(src).toContain('helper-application-rejected-banner');
    expect(src).toContain('rejected_banner_title');
    expect(src).toContain('rejected_banner_body');
    expect(src).toContain('rejected_banner_no_extra_charge');
    expect(src).not.toContain('rejection_reason');
    expect(src).not.toContain('rejected_refund');
    expect(pt).toContain('Candidatura recusada pelo cliente.');
    expect(pt).toContain('Nenhum crédito adicional será cobrado.');
    expect(en).toContain('Application declined by the client.');
    expect(fr).toContain('Candidature refusée par le client.');
    // Rejected must not show cancel menu affordance tied to non-cancelable statuses only via canCancel
    expect(src).toContain('if (!canCancel) setMenuOpen(false)');
  });

  it('HelperAcceptedJobCard and HelperCompletedHistoryCard share feed shell geometry', () => {
    const accepted = read('src/components/helpers/HelperAcceptedJobCard.tsx');
    const completed = read('src/components/helpers/HelperCompletedHistoryCard.tsx');
    expect(accepted).toContain('FEED_CARD_SHELL_CLASS');
    expect(accepted).toContain('FEED_CARD_CONTENT_CLASS');
    expect(accepted).toContain('feedCardMinContentStyle');
    expect(accepted).toContain('LhCardOverlay');
    expect(accepted).toContain('helper-accepted-open-description');
    expect(completed).toContain('FEED_CARD_SHELL_CLASS');
    expect(completed).toContain(FEED_CARD_SHELL_CLASS.split(' ')[0] ? 'FEED_CARD_SHELL_CLASS' : '');
    expect(completed).toContain('FEED_CARD_CONTENT_CLASS');
    expect(FEED_CARD_CONTENT_CLASS).toContain('px-3');
    expect(FEED_CARD_RING_SIZE_PX).toBe(68);
  });

  it('keeps business handlers intact on upcoming jobs page cancel flow', () => {
    const page = read('src/pages/helper/HelperUpcomingJobsPage.tsx');
    expect(page).toContain('HelperApplicationCard');
    expect(page).toContain('onCancel={() => setCancelTarget(app)}');
    expect(page).toContain('confirmCancelApplication');
    expect(page).toContain("updateApplicationStatus(cancelTarget.id, 'cancelled')");
    expect(page).toContain('cancelBusy');
  });
});
