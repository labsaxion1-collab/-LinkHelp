import { useMemo } from 'react';
import * as Icons from 'lucide-react';
import { clsx } from 'clsx';
import type { Application } from '@/types/application';
import type { Job } from '@/types/job';
import { LinkHelpRankBadgeFromStats } from '@/components/ranking/LinkHelpRankBadge';
import { CandidateHelperProfileExpand } from '@/components/client/CandidateHelperProfileExpand';
import { computeTrustScore } from '@/utils/reputationDossier';
import { useAppData } from '@/context/AppDataContext';

type TFn = (key: string, options?: Record<string, string | number>) => string;

export type ClientCandidateCardProps = {
  job: Job;
  app: Application;
  t: TFn;
  formatMoneyAmount: (amount: number, currency: string) => string;
  profileExpanded: boolean;
  onToggleProfile: () => void;
  onAccept?: () => void;
  onReject?: () => void;
  showAccept?: boolean;
  showReject?: boolean;
  accepting?: boolean;
  /** When false, profile is opened by the parent panel (no inline expand). Default true. */
  embedProfile?: boolean;
  acceptDisabled?: boolean;
  teamComplete?: boolean;
  budgetRangeLabel?: string | null;
  className?: string;
};

export function ClientCandidateCard({
  job,
  app,
  t,
  formatMoneyAmount,
  profileExpanded,
  onToggleProfile,
  onAccept,
  onReject,
  showAccept = false,
  showReject = false,
  accepting = false,
  embedProfile = true,
  acceptDisabled = false,
  teamComplete = false,
  budgetRangeLabel,
  className,
}: ClientCandidateCardProps) {
  const { reviews } = useAppData();

  const reviewCount = useMemo(
    () =>
      reviews.filter(
        (r) => r.targetUserId === app.helperId && (r.reviewerRole === 'client' || r.reviewerRole == null),
      ).length,
    [reviews, app.helperId],
  );

  const trustScore = computeTrustScore(app.helperJobs ?? 0, app.helperRating ?? 0, reviewCount);

  return (
    <div
      className={clsx(
        'overflow-hidden rounded-2xl border bg-white/95 shadow-sm',
        app.isExclusive ? 'border-amber-200' : 'border-slate-100',
        className,
      )}
    >
      <div className="p-3">
        {app.isExclusive ? (
          <span className="mb-2 inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-800">
            👑 {t('client_dashboard.exclusive_application_badge')}
          </span>
        ) : null}

        <p className="truncate text-sm font-black text-slate-950">{app.helperName}</p>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] font-bold text-slate-600">
          <span className="inline-flex items-center gap-1">
            <Icons.Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
            <span>{Number(app.helperRating ?? 0).toFixed(1)}</span>
          </span>
          {trustScore > 0 ? (
            <span className="tabular-nums text-slate-700">
              {t('candidate_profile.score_of_max', { score: trustScore })}
            </span>
          ) : null}
        </div>
        <div className="mt-1">
          <LinkHelpRankBadgeFromStats
            completedCount={app.helperJobs}
            averageRating={app.helperRating}
            role="helper"
            size="sm"
            showLabel
            t={t}
          />
        </div>

        {app.proposedAmount != null ? (
          <p className="mt-1.5 text-xs font-black text-slate-900">
            {t('client_dashboard.helper_proposal_amount', {
              amount: formatMoneyAmount(app.proposedAmount, job.currency || 'CAD'),
            })}
          </p>
        ) : (
          <p className="mt-1.5 text-xs font-semibold text-slate-600">
            {t('client_dashboard.helper_proposal_negotiable')}
          </p>
        )}

        {budgetRangeLabel ? (
          <p className="mt-0.5 text-[11px] font-medium text-slate-400">{budgetRangeLabel}</p>
        ) : null}

        {app.message ? (
          <p className="mt-1.5 line-clamp-2 text-[11px] italic text-slate-500">"{app.message}"</p>
        ) : null}

        <div className="mt-3 flex items-stretch gap-2">
          <button
            type="button"
            onClick={onToggleProfile}
            aria-expanded={profileExpanded}
            className={clsx(
              'inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition',
              profileExpanded
                ? 'border-blue-200 bg-blue-50 text-blue-800'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
            )}
          >
            <span aria-hidden>👤</span>
            <span>{t('candidate_profile.toggle_label')}</span>
            <Icons.ChevronDown
              className={clsx('h-3.5 w-3.5 transition-transform duration-200', profileExpanded && 'rotate-180')}
              aria-hidden
            />
          </button>

          {showAccept ? (
            <button
              type="button"
              disabled={accepting || acceptDisabled || teamComplete}
              onClick={onAccept}
              aria-label={t('client_dashboard.accept_short')}
              className="inline-flex min-h-[40px] min-w-[6.5rem] shrink-0 items-center justify-center rounded-xl bg-green-600 px-3 text-xs font-black text-white hover:bg-green-700 disabled:opacity-60"
            >
              {accepting ? (
                <Icons.Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : teamComplete ? (
                t('client_dashboard.team_complete_short')
              ) : (
                t('client_dashboard.accept_short')
              )}
            </button>
          ) : null}
        </div>

        {showReject && onReject ? (
          <button
            type="button"
            onClick={onReject}
            className={clsx(
              'mt-2 inline-flex min-h-[36px] w-full items-center justify-center rounded-xl px-3 text-xs font-bold',
              app.isExclusive
                ? 'border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                : 'bg-red-50 text-red-700 hover:bg-red-100',
            )}
          >
            {app.isExclusive
              ? t('client_dashboard.exclusive_reject_unlock')
              : t('client_dashboard.reject_helper')}
          </button>
        ) : null}
      </div>

      {embedProfile ? (
        <div
          style={{
            display: 'grid',
            gridTemplateRows: profileExpanded ? '1fr' : '0fr',
            transition: 'grid-template-rows 280ms cubic-bezier(0.4,0,0.2,1)',
          }}
        >
          <div className="overflow-hidden" style={{ minHeight: 0 }}>
            {profileExpanded ? (
              <CandidateHelperProfileExpand
                helperId={app.helperId}
                helperRating={app.helperRating}
                helperJobs={app.helperJobs}
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
