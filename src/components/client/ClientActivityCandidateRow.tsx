import * as Icons from 'lucide-react';
import { clsx } from 'clsx';
import type { Application } from '@/types/application';
import type { Job } from '@/types/job';
import { LinkHelpRankBadgeFromStats } from '@/components/ranking/LinkHelpRankBadge';
import { firstNameFromHelperName } from '@/utils/clientActivityCandidateRing';

type TFn = (key: string, options?: Record<string, string | number>) => string;

export type ClientActivityCandidateRowProps = {
  job: Job;
  app: Application;
  t: TFn;
  formatMoneyAmount: (amount: number, currency: string) => string;
  onOpenProfile: () => void;
  onAccept: () => void;
  onReject: () => void;
  accepting: boolean;
  rejecting: boolean;
  acceptDisabled: boolean;
  rejectDisabled: boolean;
  teamComplete: boolean;
  className?: string;
};

/**
 * Compact candidate line for client open-request card panels.
 * Photo | first name | rank | amount | Accept | Reject
 */
export function ClientActivityCandidateRow({
  job,
  app,
  t,
  formatMoneyAmount,
  onOpenProfile,
  onAccept,
  onReject,
  accepting,
  rejecting,
  acceptDisabled,
  rejectDisabled,
  teamComplete,
  className,
}: ClientActivityCandidateRowProps) {
  const firstName = firstNameFromHelperName(app.helperName);
  const amountLabel =
    app.proposedAmount != null
      ? formatMoneyAmount(app.proposedAmount, job.currency || 'CAD')
      : t('client_dashboard.helper_proposal_negotiable_short');
  const busy = accepting || rejecting;

  return (
    <div
      data-testid="client-activity-candidate-row"
      data-application-id={app.id}
      className={clsx(
        'flex min-w-0 items-center gap-1.5 rounded-xl border border-slate-100 bg-white px-1.5 py-1.5 sm:gap-2 sm:px-2',
        className,
      )}
    >
      <button
        type="button"
        data-testid="client-activity-candidate-identity"
        onClick={onOpenProfile}
        className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
        aria-label={t('client_dashboard.open_candidate_profile', { name: firstName })}
      >
        <img
          src={app.helperAvatar}
          alt=""
          className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-slate-200"
        />
        <span className="min-w-0 truncate text-[12px] font-bold text-slate-900 sm:text-[13px]">
          {firstName}
        </span>
        <LinkHelpRankBadgeFromStats
          completedCount={app.helperJobs}
          averageRating={app.helperRating}
          role="helper"
          size="sm"
          showLabel={false}
          t={t}
          className="shrink-0"
        />
      </button>

      <span
        className="max-w-[4.5rem] shrink-0 truncate text-right text-[11px] font-black tabular-nums text-slate-800 sm:max-w-[5.5rem] sm:text-[12px]"
        data-testid="client-activity-candidate-amount"
        title={amountLabel}
      >
        {amountLabel}
      </span>

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          data-testid="client-activity-candidate-accept"
          disabled={busy || acceptDisabled || teamComplete}
          onClick={onAccept}
          aria-label={t('client_dashboard.accept_short')}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 sm:h-8 sm:min-w-[4.25rem] sm:w-auto sm:px-2 sm:text-[11px] sm:font-black"
        >
          {accepting ? (
            <Icons.Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <>
              <Icons.Check className="h-3.5 w-3.5 sm:hidden" aria-hidden />
              <span className="hidden sm:inline">{t('client_dashboard.accept_short')}</span>
            </>
          )}
        </button>
        <button
          type="button"
          data-testid="client-activity-candidate-reject"
          disabled={busy || rejectDisabled}
          onClick={onReject}
          aria-label={t('client_dashboard.reject_helper')}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 sm:h-8 sm:min-w-[4.25rem] sm:w-auto sm:px-2 sm:text-[11px] sm:font-bold"
        >
          {rejecting ? (
            <Icons.Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <>
              <Icons.X className="h-3.5 w-3.5 sm:hidden" aria-hidden />
              <span className="hidden sm:inline">{t('client_dashboard.reject_helper')}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
