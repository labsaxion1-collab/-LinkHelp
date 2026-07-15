import * as Icons from 'lucide-react';
import { clsx } from 'clsx';
import type { Application } from '@/types/application';
import type { Job } from '@/types/job';
import { translateCategory, translateJobTitle, resolveCategoryId } from '@/utils/translateCategory';
import { getCategoryFeedTheme } from '@/utils/categoryFeedTheme';
import { getCategoryIconById } from '@/utils/categoryIcons';
import { formatJobOpenedAt } from '@/utils/jobDisplay';
import { formatJobBudgetAmount } from '@/utils/formatJobBudget';
import { formatMoneyAmount } from '@/utils/jobProposal';
import { isJobPaused } from '@/utils/jobVisibility';
import { LhCard } from '@/components/design-system/LhCard';
import { InterestedRing } from '@/components/opportunities/InterestedRing';

type Props = {
  app: Application;
  job: Job;
  t: (key: string, vars?: Record<string, string | number>) => string;
  onOpenDetails?: () => void;
  onCancel?: () => void;
  onOpenChat?: () => void;
};

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  viewed: 'bg-blue-50 text-blue-700 border-blue-200',
  accepted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-50 text-red-600 border-red-200',
  completed: 'bg-purple-50 text-purple-700 border-purple-200',
  cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
};

function clientInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  return (parts[0]?.slice(0, 2) ?? '?').toUpperCase();
}

function clientLocationDisplay(job: Job, fallback: string): string {
  const parts = [job.city?.trim(), job.region?.trim()].filter(Boolean);
  if (parts.length) return parts.join(', ');
  const loc = job.location?.trim();
  if (loc) return loc.length > 28 ? `${loc.slice(0, 26)}…` : loc;
  return fallback;
}

export function HelperApplicationCard({ app, job, t, onOpenDetails, onCancel, onOpenChat }: Props) {
  const catId = resolveCategoryId(job.category) ?? 'other';
  const categoryTheme = getCategoryFeedTheme(job.category);
  const CategoryIcon = getCategoryIconById(catId);
  const category = translateCategory(job.category, t);
  const title = translateJobTitle(job.title, job.category, job.subcategory, t);
  const showCategoryLine = !title.startsWith(`${category}:`);
  const budgetAmount = formatJobBudgetAmount(job, t);
  const budgetNotInformed = budgetAmount === t('jobs.budget_not_informed');
  const openedLabel = formatJobOpenedAt(job.createdAt, t);
  const clientLoc = clientLocationDisplay(job, t('jobs.remote'));
  const applicationsCount = job.applicantCount ?? 0;

  const statusText: Record<string, string> = {
    pending: t('helper_dashboard.app_pending'),
    viewed: t('helper_dashboard.app_viewed'),
    accepted: t('helper_dashboard.app_accepted'),
    rejected: t('helper_dashboard.app_rejected'),
    completed: t('helper_dashboard.app_completed'),
    cancelled: t('helper_dashboard.app_cancelled'),
  };

  const proposedLabel =
    app.proposedAmount != null && app.proposedAmount > 0
      ? formatMoneyAmount(app.proposedAmount, job.currency)
      : null;

  const canCancel = (app.status === 'pending' || app.status === 'viewed') && !!onCancel;
  const canChat = !!app.chatUnlocked && !!onOpenChat;

  const ctaBase =
    'inline-flex min-h-[44px] min-w-0 max-w-full w-full items-center justify-center gap-2 rounded-[14px] px-3 py-2.5 text-[12px] font-bold leading-tight transition-all duration-200 sm:min-h-0 sm:w-auto sm:px-4 sm:text-[13px] md:text-[14px]';

  return (
    <LhCard
      padding="none"
      className={clsx(
        'group/card relative h-full w-full max-w-full overflow-hidden rounded-[22px] border border-[rgba(15,23,42,0.08)] bg-white transition-all duration-300',
        'shadow-[0_2px_12px_rgba(15,23,42,0.05),0_6px_28px_rgba(15,23,42,0.06)]',
        'md:hover:-translate-y-1 md:hover:shadow-[0_12px_40px_rgba(15,23,42,0.10)] motion-reduce:transform-none',
        onOpenDetails && 'cursor-pointer',
      )}
      onClick={onOpenDetails}
      role={onOpenDetails ? 'button' : undefined}
      tabIndex={onOpenDetails ? 0 : undefined}
      onKeyDown={onOpenDetails ? (e) => e.key === 'Enter' && onOpenDetails() : undefined}
    >
      <div
        className="h-[4px] w-full shrink-0 rounded-t-[22px]"
        style={{
          background: `linear-gradient(90deg, ${categoryTheme.iconColor} 0%, ${categoryTheme.iconColor}55 55%, transparent 100%)`,
        }}
        aria-hidden
      />

      <div className="relative bg-white px-3 pb-3 pt-3 sm:px-4 sm:pb-4 sm:pt-4">
        <div className="grid w-full min-w-0 grid-cols-[52px_minmax(0,1fr)_80px] grid-rows-[auto_auto_auto] gap-x-2 gap-y-1.5 sm:grid-cols-[64px_minmax(0,1fr)_80px] sm:gap-x-3 sm:gap-y-2">
          <div
            className="col-start-1 row-start-1 row-span-2 flex h-[52px] w-[52px] items-center justify-center self-start rounded-xl border sm:h-16 sm:w-16 sm:rounded-[18px]"
            style={{
              backgroundColor: categoryTheme.iconBg,
              borderColor: `${categoryTheme.iconColor}28`,
              boxShadow: `0 6px 18px ${categoryTheme.iconColor}18`,
            }}
          >
            <CategoryIcon
              className="h-6 w-6 sm:h-7 sm:w-7"
              style={{ color: categoryTheme.iconColor }}
              strokeWidth={1.9}
              aria-hidden
            />
          </div>

          <div className="col-start-2 row-start-1 min-w-0 overflow-hidden pr-1">
            <div className="flex min-w-0 items-start gap-2">
              <span className="block min-w-0 flex-1 truncate whitespace-nowrap text-[16px] font-bold leading-snug text-[#0F172A] sm:text-[18px]">
                {title}
              </span>
              {app.isExclusive ? (
                <span className="mt-0.5 flex shrink-0 items-center gap-0.5 rounded-md border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-black text-amber-700">
                  <Icons.Crown className="h-2.5 w-2.5" />
                  {t('upcoming_jobs.app_exclusive_badge')}
                </span>
              ) : null}
              {isJobPaused(job) ? (
                <span className="mt-0.5 flex shrink-0 items-center gap-0.5 rounded-md border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-[10px] font-black text-slate-700">
                  <Icons.Pause className="h-2.5 w-2.5" />
                  {t('helper_dashboard.request_paused_badge')}
                </span>
              ) : null}
            </div>
          </div>

          <div className="col-start-2 row-start-2 min-w-0 self-start space-y-1 overflow-hidden">
            {showCategoryLine ? (
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="h-[7px] w-[7px] shrink-0 rounded-full"
                  style={{ backgroundColor: categoryTheme.dotColor }}
                />
                <span className="truncate whitespace-nowrap text-[13px] font-medium text-[#64748B]">
                  {category}
                </span>
              </div>
            ) : null}

            <div
              className="flex min-w-0 items-center gap-1.5 overflow-hidden"
              style={{ color: categoryTheme.budgetColor }}
            >
              <Icons.Link2 className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
              <span className="truncate whitespace-nowrap text-[13px] font-bold">
                {budgetNotInformed ? budgetAmount : t('jobs.budget_with_amount', { amount: budgetAmount })}
              </span>
            </div>

            {proposedLabel ? (
              <div className="flex min-w-0 items-center gap-1.5 overflow-hidden text-emerald-700">
                <Icons.Banknote className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
                <span className="truncate whitespace-nowrap text-[13px] font-bold">
                  {t('helper_dashboard.app_your_proposal', { amount: proposedLabel })}
                </span>
              </div>
            ) : null}

            {openedLabel ? (
              <div className="flex min-w-0 items-center gap-1.5 overflow-hidden text-[#94A3B8]">
                <Icons.Calendar className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
                <span className="truncate whitespace-nowrap text-[12px] font-medium">{openedLabel}</span>
              </div>
            ) : null}
          </div>

          <div className="col-start-3 row-start-1 row-span-2 flex shrink-0 flex-col items-center justify-center gap-2 self-center">
            <span
              className={clsx(
                'rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                STATUS_BADGE[app.status] ?? 'border-slate-200 bg-slate-50 text-slate-500',
              )}
            >
              {statusText[app.status] ?? t('common.unknown')}
            </span>
            <InterestedRing
              interestedCount={applicationsCount}
              label={t('helper_dashboard.interested_ring_label')}
              size={72}
            />
          </div>

          <div
            className="col-span-3 col-start-1 row-start-3 mt-0.5 flex flex-col gap-2 border-t border-[rgba(15,23,42,0.06)] pt-2.5 sm:flex-row sm:items-center sm:justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden text-left">
              {job.clientAvatar && !job.clientAvatar.includes('pravatar') ? (
                <img
                  src={job.clientAvatar}
                  alt=""
                  className="h-8 w-8 shrink-0 rounded-full object-cover ring-2 ring-white shadow-sm"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-2 ring-white shadow-sm"
                  style={{
                    backgroundColor: categoryTheme.iconBg,
                    color: categoryTheme.iconColor,
                  }}
                >
                  {clientInitials(job.clientName)}
                </div>
              )}
              <div className="min-w-0 overflow-hidden">
                <p className="truncate whitespace-nowrap text-[14px] font-bold leading-tight text-[#0F172A]">
                  {job.clientName}
                </p>
                <p className="mt-0.5 truncate whitespace-nowrap text-[12px] font-medium text-[#94A3B8]">
                  {clientLoc}
                </p>
              </div>
            </div>

            <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row">
              {canChat ? (
                <button
                  type="button"
                  onClick={onOpenChat}
                  className={clsx(
                    ctaBase,
                    'border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100',
                  )}
                >
                  <Icons.MessageSquare className="h-[15px] w-[15px] shrink-0" />
                  <span>{t('upcoming_jobs.open_chat')}</span>
                </button>
              ) : null}
              {canCancel ? (
                <button
                  type="button"
                  onClick={onCancel}
                  className={clsx(
                    ctaBase,
                    'border border-red-200/90 bg-red-50 text-red-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] hover:bg-red-100 active:scale-[0.97]',
                  )}
                >
                  <Icons.XCircle className="h-[15px] w-[15px] shrink-0" strokeWidth={2.25} aria-hidden />
                  <span className="text-center">{t('helper_dashboard.cancel_application')}</span>
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </LhCard>
  );
}
