import React, { useState } from 'react';
import * as Icons from 'lucide-react';
import { clsx } from 'clsx';
import type { Application } from '@/types/application';
import type { Job } from '@/types/job';
import { LhCard } from '@/components/design-system/LhCard';
import { LhCardOverlay } from '@/components/design-system/LhCardOverlay';
import {
  FEED_CARD_PREMIUM_BODY_CLASS,
  FEED_CARD_PREMIUM_MUTED_CLASS,
  FEED_CARD_PREMIUM_SCROLL_CLASS,
  FEED_CARD_PREMIUM_SHELL_CLASS,
} from '@/components/opportunities/feedCardPremiumTheme';
import { getCategoryFeedTheme } from '@/utils/categoryFeedTheme';
import { getCategoryIconById } from '@/utils/categoryIcons';
import { formatJobBudgetAmount } from '@/utils/formatJobBudget';
import { formatJobOpenedAt } from '@/utils/jobDisplay';
import { isJobExpired } from '@/utils/jobVisibility';
import {
  translateCategory,
  translateJobTitle,
  translateServiceSubcategory,
} from '@/utils/translateCategory';
import {
  FEED_CARD_CONTENT_CLASS,
  FEED_CARD_FIXED_HEIGHT_EXTRA_PX,
  FEED_CARD_SHELL_CLASS,
  FEED_CARD_STANDARD_CONTENT_HEIGHT_PX,
  FEED_CARD_TOP_ACCENT_CLASS,
  feedCardMinContentStyle,
} from '@/utils/feedCardFixedHeight';

type TFn = (key: string, options?: Record<string, string | number>) => string;

type Props = {
  job: Job;
  t: TFn;
  hiredApplication?: Application | null;
};

/** Read-only compact history card for cancelled / expired client listings. */
export function ClientHistoryClosedCard({ job, t, hiredApplication = null }: Props) {
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const CategoryIcon = getCategoryIconById(job.category);
  const categoryTheme = getCategoryFeedTheme(job.category);
  const title = translateJobTitle(job.title, job.category, job.subcategory, t);
  const category = translateCategory(job.category, t);
  const subcategory = job.subcategory
    ? translateServiceSubcategory(job.category, job.subcategory, t)
    : null;
  const expired = isJobExpired(job) || job.status === 'expired';
  const banner = expired
    ? t('client_history.expired_banner')
    : t('client_history.cancelled_banner');
  const statusLabel = expired
    ? t('client_history.expired_banner')
    : t('client_history.cancelled_banner');
  const modality =
    job.serviceMode === 'remote'
      ? t('create_modal.service_mode_remote')
      : job.serviceMode === 'in_person'
        ? t('create_modal.service_mode_in_person')
        : job.location?.trim()
          ? job.location.split(',').slice(0, 2).join(',').trim()
          : t('jobs.remote');
  const openedLabel = formatJobOpenedAt(job.createdAt, t);
  const helperName = hiredApplication?.helperName?.trim() || null;

  return (
    <>
      <LhCard
        padding="none"
        className={FEED_CARD_SHELL_CLASS}
        data-testid={`client-history-closed-${job.id}`}
        data-feed-card-min-height={FEED_CARD_STANDARD_CONTENT_HEIGHT_PX}
        data-feed-card-height-extra={FEED_CARD_FIXED_HEIGHT_EXTRA_PX}
      >
        <div
          className={FEED_CARD_TOP_ACCENT_CLASS}
          style={{
            background: `linear-gradient(90deg, ${categoryTheme.iconColor} 0%, ${categoryTheme.iconColor}55 55%, transparent 100%)`,
          }}
          aria-hidden
        />
        <div
          className={clsx(FEED_CARD_CONTENT_CLASS, 'flex min-h-0 flex-col')}
          style={feedCardMinContentStyle()}
        >
          <div className="flex min-w-0 items-start gap-2">
            <div
              className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-xl border sm:h-[52px] sm:w-[52px] sm:rounded-[16px]"
              style={{
                backgroundColor: categoryTheme.iconBg,
                borderColor: `${categoryTheme.iconColor}28`,
                boxShadow: `0 5px 14px ${categoryTheme.iconColor}16`,
              }}
            >
              <CategoryIcon
                className="h-[22px] w-[22px] sm:h-6 sm:w-6"
                style={{ color: categoryTheme.iconColor }}
                strokeWidth={1.9}
                aria-hidden
              />
            </div>

            <div className="min-w-0 flex-1 pr-0.5">
              <h3 className="line-clamp-2 text-[15px] font-bold leading-[1.28] text-[#0F172A] sm:text-[17px] sm:leading-[1.3]">
                {title}
              </h3>
              <p className="mt-0.5 truncate text-[11px] font-semibold text-[#94A3B8]">
                {subcategory ? `${category} · ${subcategory}` : category}
              </p>
              <p
                className="mt-1 truncate whitespace-nowrap text-[13px] font-black tabular-nums"
                style={{ color: categoryTheme.budgetColor }}
                data-testid={`client-history-closed-budget-${job.id}`}
              >
                {formatJobBudgetAmount(job, t)}
              </p>
            </div>

            <span
              data-testid={`client-history-closed-status-${job.id}`}
              className={clsx(
                'shrink-0 whitespace-nowrap rounded-md border px-1.5 py-0.5 text-center text-[9px] font-bold uppercase tracking-wide',
                expired
                  ? 'border-amber-200 bg-amber-50 text-amber-800'
                  : 'border-slate-200 bg-slate-100 text-slate-600',
              )}
            >
              {expired ? t('client_history.status_expired') : t('client_history.status_cancelled')}
            </span>
          </div>

          <div className="mt-2 space-y-1 text-[11px] font-semibold text-[#64748B]">
            <p className="truncate">
              <Icons.MapPin className="mr-1 inline h-3 w-3 align-[-1px] text-[#94A3B8]" aria-hidden />
              {t('client_dashboard.activity_modality')}: {modality}
            </p>
            <p className="truncate">
              <Icons.Calendar className="mr-1 inline h-3 w-3 align-[-1px] text-[#94A3B8]" aria-hidden />
              {openedLabel}
            </p>
            {helperName ? (
              <p className="truncate" data-testid={`client-history-closed-helper-${job.id}`}>
                <Icons.User className="mr-1 inline h-3 w-3 align-[-1px] text-[#94A3B8]" aria-hidden />
                {t('client_jobs.history_help_performed')}: {helperName}
              </p>
            ) : null}
          </div>

          <div
            className={clsx(
              'mt-2 rounded-xl px-2.5 py-1.5 text-[11px] font-bold',
              expired ? 'bg-amber-50 text-amber-900' : 'bg-slate-100 text-slate-700',
            )}
          >
            {banner}
          </div>

          <div className="mt-auto flex items-center justify-between gap-2 border-t border-[rgba(15,23,42,0.06)] pt-2">
            <button
              type="button"
              onClick={() => setDescriptionOpen(true)}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-[rgba(15,23,42,0.08)] bg-[#f8fafc] px-2.5 text-[12px] font-bold text-[#0F172A] transition hover:bg-slate-50"
              data-testid={`client-history-closed-description-${job.id}`}
            >
              <Icons.FileText className="h-3.5 w-3.5 text-[#64748B]" aria-hidden />
              {t('common.description')}
            </button>
            <span className="sr-only">{statusLabel}</span>
          </div>
        </div>
      </LhCard>

      <LhCardOverlay
        open={descriptionOpen}
        onClose={() => setDescriptionOpen(false)}
        title={title}
        subtitle={category}
        testId={`client-history-closed-description-overlay-${job.id}`}
      >
        <div className={clsx(FEED_CARD_PREMIUM_SHELL_CLASS, 'rounded-2xl p-1')}>
          <div className={clsx(FEED_CARD_PREMIUM_SCROLL_CLASS, FEED_CARD_PREMIUM_BODY_CLASS)}>
            <p className={clsx('whitespace-pre-wrap text-sm leading-relaxed', FEED_CARD_PREMIUM_MUTED_CLASS)}>
              {job.description?.trim() || t('helper_dashboard.feed_card_no_description')}
            </p>
          </div>
        </div>
      </LhCardOverlay>
    </>
  );
}
