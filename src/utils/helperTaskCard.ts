import type { Application } from '@/types/application';
import type { Job } from '@/types/job';
import type { UpcomingWorkflowStatus } from '@/types/upcoming';
import { calculateHelperLeadCreditCost } from '@/utils/calculateHelperLeadCreditCost';
import { getApplicationChargeLc } from '@/config/helperCreditCharge';
import { getVipApplicationChargeLc } from '@/utils/vipApplicationCredits';
import {
  canHelperRequestCompletion,
  isTerminalWorkflow,
} from '@/utils/serviceWorkflow';

export type HelperTaskAccordion = 'client' | 'description' | null;

export function helperTaskAccordionKey(appId: string): string {
  return appId;
}

export function helperAcceptedAccordionKey(upcomingId: string): string {
  return upcomingId;
}

/** Toggle mutually exclusive accordions — clicking open panel closes it. */
export function toggleHelperTaskAccordion(
  current: HelperTaskAccordion,
  target: Exclude<HelperTaskAccordion, null>,
): HelperTaskAccordion {
  return current === target ? null : target;
}

export function clientFirstName(fullName: string): string {
  const part = fullName.trim().split(/\s+/).filter(Boolean)[0];
  return part || fullName.trim() || '?';
}

export function clientInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  return (parts[0]?.slice(0, 2) ?? '?').toUpperCase();
}

/** LinkCredits debited when helper applied (Normal or VIP). */
export function resolveApplicationDebitedLc(
  job: Job,
  app: Pick<Application, 'isExclusive'>,
  distanceKm?: number | null,
): number {
  const breakdown = calculateHelperLeadCreditCost(job, { distanceKm: distanceKm ?? undefined });
  const normal = getApplicationChargeLc(breakdown);
  return app.isExclusive ? getVipApplicationChargeLc(normal) : normal;
}

/** 50% VIP refund hint when application was rejected. */
export function resolveVipRefundLc(debitedLc: number, app: Pick<Application, 'isExclusive' | 'status'>): number | null {
  if (!app.isExclusive || app.status !== 'rejected') return null;
  return Math.floor(debitedLc / 2);
}

export function canShowCompleteWorkButton(workflowStatus: UpcomingWorkflowStatus): boolean {
  return canHelperRequestCompletion(workflowStatus);
}

export function canShowReviewButton(
  workflowStatus: UpcomingWorkflowStatus,
  jobStatus: Job['status'],
  hasPendingReview: boolean,
): boolean {
  if (!hasPendingReview) return false;
  if (jobStatus === 'completed') return true;
  return workflowStatus === 'completed' || workflowStatus === 'auto_completed';
}

export function isAcceptedJobActive(workflowStatus: UpcomingWorkflowStatus): boolean {
  return !isTerminalWorkflow(workflowStatus);
}

/** Relative "applied ago" label from the application timestamp — no live ticker. */
export function formatApplicationSentAgo(
  createdAt: number,
  now: number,
  t: (key: string, vars?: Record<string, string | number>) => string,
): string {
  if (!Number.isFinite(createdAt) || createdAt <= 0) return '';
  const ageMs = Math.max(0, now - createdAt);
  const days = Math.floor(ageMs / (24 * 60 * 60 * 1000));
  const hours = Math.floor(ageMs / (60 * 60 * 1000));
  const minutes = Math.max(1, Math.floor(ageMs / (60 * 1000)));
  if (days >= 1) return t('helper_tasks.applied_ago_days', { count: days });
  if (hours >= 1) return t('helper_tasks.applied_ago_hours', { count: hours });
  return t('helper_tasks.applied_ago_minutes', { count: minutes });
}

/** Relative schedule label — Tomorrow, In 5 days, Today 14:00, etc. */
export function formatRelativeScheduleLabel(
  scheduledAt: number,
  now: number,
  locale: string,
  t: (key: string, vars?: Record<string, string | number>) => string,
): string {
  if (!scheduledAt || !Number.isFinite(scheduledAt)) return '';

  const diff = scheduledAt - now;
  const clock = (() => {
    try {
      return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(
        new Date(scheduledAt),
      );
    } catch {
      return '';
    }
  })();

  const d0 = new Date(now);
  const d1 = new Date(scheduledAt);
  const sameDay =
    d0.getFullYear() === d1.getFullYear() &&
    d0.getMonth() === d1.getMonth() &&
    d0.getDate() === d1.getDate();

  if (sameDay) {
    return clock ? t('helper_tasks.rel_today_time', { time: clock }) : t('upcoming_jobs.rel_today');
  }

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow =
    d1.getFullYear() === tomorrow.getFullYear() &&
    d1.getMonth() === tomorrow.getMonth() &&
    d1.getDate() === tomorrow.getDate();
  if (isTomorrow) return t('upcoming_jobs.rel_tomorrow');

  const dayDiff = Math.ceil((d1.setHours(0, 0, 0, 0) - d0.setHours(0, 0, 0, 0)) / 86_400_000);
  if (dayDiff > 1 && dayDiff <= 14) {
    return t('helper_tasks.rel_in_days', { count: dayDiff });
  }

  try {
    return new Intl.DateTimeFormat(locale, { weekday: 'short', month: 'short', day: 'numeric' }).format(
      new Date(scheduledAt),
    );
  } catch {
    return '';
  }
}
