import * as Icons from 'lucide-react';
import type { Application } from '@/types/application';
import type { Job } from '@/types/job';
import { translateCategory, translateJobTitle, resolveCategoryId } from '@/utils/translateCategory';
import { getCategoryFeedTheme } from '@/utils/categoryFeedTheme';
import { getCategoryIconById } from '@/utils/categoryIcons';
import { formatJobScheduleDisplay } from '@/utils/jobDisplay';
import { formatMoneyAmount } from '@/utils/jobProposal';

type Props = {
  app: Application;
  job: Job;
  t: (key: string, vars?: Record<string, string | number>) => string;
  onOpenDetails?: () => void;
  onCancel?: () => void;
  onOpenChat?: () => void;
};

const STATUS_BADGE: Record<string, string> = {
  pending:   'bg-amber-50 text-amber-700 border-amber-200',
  viewed:    'bg-blue-50 text-blue-700 border-blue-200',
  accepted:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected:  'bg-red-50 text-red-600 border-red-200',
  completed: 'bg-purple-50 text-purple-700 border-purple-200',
  cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
};

export function HelperApplicationCard({ app, job, t, onOpenDetails, onCancel, onOpenChat }: Props) {
  const theme = getCategoryFeedTheme(job.category);
  const catId = resolveCategoryId(job.category) ?? 'other';
  const CategoryIcon = getCategoryIconById(catId);

  const statusText: Record<string, string> = {
    pending:   t('helper_dashboard.app_pending'),
    viewed:    t('helper_dashboard.app_viewed'),
    accepted:  t('helper_dashboard.app_accepted'),
    rejected:  t('helper_dashboard.app_rejected'),
    completed: t('helper_dashboard.app_completed'),
    cancelled: t('helper_dashboard.app_cancelled'),
  };

  const canCancel = (app.status === 'pending' || app.status === 'viewed') && !!onCancel;
  const canChat   = !!app.chatUnlocked && !!onOpenChat;

  const proposedLabel =
    app.proposedAmount && app.proposedAmount > 0
      ? formatMoneyAmount(app.proposedAmount, job.currency)
      : null;

  const shortLocation = job.location
    ? job.location.split(',').slice(0, 2).join(',').trim()
    : null;

  return (
    <div
      className="relative flex overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
      onClick={onOpenDetails}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onOpenDetails?.()}
    >
      {/* left accent bar */}
      <div
        className="w-1 shrink-0 rounded-l-2xl"
        style={{ background: theme.iconColor }}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-2 p-3 sm:p-4">
        {/* row 1: category icon + category name + status badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <div
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
              style={{ background: theme.iconBg }}
            >
              <CategoryIcon className="h-3.5 w-3.5" style={{ color: theme.iconColor }} />
            </div>
            <span className="truncate text-xs font-bold" style={{ color: theme.iconColor }}>
              {translateCategory(job.category, t)}
            </span>
            {app.isExclusive && (
              <span className="ml-1 flex shrink-0 items-center gap-0.5 rounded-md border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-black text-amber-700">
                <Icons.Crown className="h-2.5 w-2.5" />
                {t('upcoming_jobs.app_exclusive_badge')}
              </span>
            )}
          </div>
          <span
            className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATUS_BADGE[app.status] ?? 'border-slate-200 bg-slate-50 text-slate-500'}`}
          >
            {statusText[app.status] ?? app.status}
          </span>
        </div>

        {/* row 2: title */}
        <h3 className="truncate text-sm font-black leading-snug text-gray-900">
          {translateJobTitle(job.title, job.category, job.subcategory, t)}
        </h3>

        {/* row 3: meta chips — date + location + value */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
            <Icons.Calendar className="h-3 w-3 shrink-0" />
            {formatJobScheduleDisplay(job, t)}
          </span>
          {shortLocation && (
            <>
              <span className="text-gray-300">·</span>
              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                <Icons.MapPin className="h-3 w-3 shrink-0" />
                <span className="max-w-[140px] truncate">{shortLocation}</span>
              </span>
            </>
          )}
          {proposedLabel ? (
            <>
              <span className="text-gray-300">·</span>
              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-xs font-bold text-emerald-700">
                <Icons.Banknote className="h-3 w-3 shrink-0" />
                {proposedLabel}
              </span>
            </>
          ) : null}
        </div>

        {/* row 4: action bar */}
        {(canCancel || canChat) && (
          <div
            className="flex flex-wrap gap-2 border-t border-gray-50 pt-2"
            onClick={(e) => e.stopPropagation()}
          >
            {canChat && (
              <button
                type="button"
                onClick={onOpenChat}
                className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
              >
                <Icons.MessageSquare className="h-3.5 w-3.5" />
                {t('upcoming_jobs.open_chat')}
              </button>
            )}
            {canCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-100"
              >
                <Icons.XCircle className="h-3.5 w-3.5" />
                {t('helper_dashboard.cancel_application')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
