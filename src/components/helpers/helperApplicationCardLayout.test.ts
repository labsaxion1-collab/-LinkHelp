import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  ACTIVITY_APPLICATION_CARD_MIN_CONTENT_HEIGHT_PX,
  FEED_CARD_RING_SIZE_PX,
  FEED_CARD_STANDARD_CONTENT_HEIGHT_PX,
} from '@/utils/feedCardFixedHeight';
import { isWaitingApplicationStatus } from '@/utils/helperHistoryBuckets';

const root = new URL('../../../', import.meta.url);

function read(rel: string): string {
  return readFileSync(new URL(rel, root), 'utf8');
}

describe('helper application card layout (pending)', () => {
  const src = read('src/components/helpers/HelperApplicationCard.tsx');

  it('prioritizes a two-line title without a competing top wait badge', () => {
    expect(src).toContain('helper-application-title');
    expect(src).toContain('line-clamp-2');
    expect(src).toContain('!showWaitStrip');
    expect(src).toContain('helper-application-wait-strip');
    expect(src).toContain('waiting_client_title');
    // Top status chip must not render while the wait strip is shown.
    expect(src).toMatch(/!showWaitStrip \? \(\s*<span[\s\S]*helper-application-status/);
  });

  it('does not reuse the feed interessados ring on helper activity cards', () => {
    expect(src).not.toContain('InterestedRing');
    expect(src).not.toContain('applicantCount');
    expect(src).not.toContain('interested_ring_label');
    expect(src).toContain('activityApplicationCardMinContentStyle');
    expect(ACTIVITY_APPLICATION_CARD_MIN_CONTENT_HEIGHT_PX).toBeLessThan(
      FEED_CARD_STANDARD_CONTENT_HEIGHT_PX,
    );
    expect(FEED_CARD_RING_SIZE_PX).toBe(68);
  });

  it('keeps VIP exclusivity copy inside the wait strip only', () => {
    expect(src).toContain('helper-application-vip-chip');
    expect(src).toContain('helper-application-exclusive-note');
    expect(src).toContain('exclusive_application_note');
    expect(src).toContain('app.isExclusive');
  });

  it('preserves budget, proposal, overlays and cancel menu', () => {
    expect(src).toContain('helper-application-budget');
    expect(src).toContain('helper-application-proposal');
    expect(src).toContain('helper-application-open-profile');
    expect(src).toContain('helper-application-open-description');
    expect(src).toContain('LhCardOverlay');
    expect(src).toContain('helper-application-cancel-menu-item');
    expect(src).toContain('canCancel');
  });

  it('rejected/cancelled history never uses waiting status strip alone', () => {
    expect(isWaitingApplicationStatus('pending')).toBe(true);
    expect(isWaitingApplicationStatus('viewed')).toBe(true);
    expect(isWaitingApplicationStatus('rejected')).toBe(false);
    expect(isWaitingApplicationStatus('cancelled')).toBe(false);
    expect(isWaitingApplicationStatus('accepted')).toBe(false);
    expect(src).toContain('helper-application-rejected-banner');
    expect(src).toContain('helper-application-history-banner');
  });
});

describe('helper accepted job card', () => {
  it('exposes title, status, value, location, schedule, chat and description', () => {
    const src = read('src/components/helpers/HelperAcceptedJobCard.tsx');
    expect(src).toContain('helper-accepted-title');
    expect(src).toContain('line-clamp-2');
    expect(src).toContain('helper-accepted-status');
    expect(src).toContain('helper-accepted-value');
    expect(src).toContain('helper-accepted-location');
    expect(src).toContain('helper-accepted-schedule');
    expect(src).toContain('helper-accepted-open-description');
    expect(src).toContain('upcoming_jobs.open_chat');
    expect(src).toContain('LhCardOverlay');
  });
});

describe('activities partition stays server-driven', () => {
  it('upcoming page still partitions via helper history buckets', () => {
    const page = read('src/pages/helper/HelperUpcomingJobsPage.tsx');
    expect(page).toContain('partitionHelperHistory');
    expect(page).toContain('activeApplications');
    expect(page).toContain('activeAcceptedJobs');
    expect(page).not.toContain('optimisticAccept');
  });
});

describe('mobile width contracts for activity cards', () => {
  it('keeps title clamping and compact paddings suitable for 240–390px', () => {
    const src = read('src/components/helpers/HelperApplicationCard.tsx');
    const tokens = read('src/utils/feedCardFixedHeight.ts');
    expect(src).toContain('FEED_CARD_CONTENT_CLASS');
    expect(tokens).toContain('px-3');
    expect(tokens).toContain('sm:px-4');
    expect(src).toContain('line-clamp-2');
    expect(src).toContain('min-h-[44px]');
  });
});
