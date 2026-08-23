import React, { useState } from 'react';
import * as Icons from 'lucide-react';
import { clsx } from 'clsx';
import type { Job } from '@/types/job';
import { LhCard } from '@/components/design-system/LhCard';
import { LhCardOverlay } from '@/components/design-system/LhCardOverlay';
import {
  FEED_CARD_PREMIUM_BODY_CLASS,
  FEED_CARD_PREMIUM_MUTED_CLASS,
  FEED_CARD_PREMIUM_SCROLL_CLASS,
  FEED_CARD_PREMIUM_SHELL_CLASS,
  FEED_CARD_PREMIUM_SURFACE_CLASS,
  FEED_CARD_PREMIUM_TITLE_CLASS,
} from '@/components/opportunities/feedCardPremiumTheme';
import { getCategoryFeedTheme } from '@/utils/categoryFeedTheme';
import { getCategoryIconById } from '@/utils/categoryIcons';
import { formatJobBudgetAmount } from '@/utils/formatJobBudget';
import { isJobExpired } from '@/utils/jobVisibility';
import { translateCategory, translateJobTitle } from '@/utils/translateCategory';
import {
  FEED_CARD_CONTENT_CLASS,
  FEED_CARD_SHELL_CLASS,
  FEED_CARD_STANDARD_CONTENT_HEIGHT_PX,
  FEED_CARD_TOP_ACCENT_CLASS,
  feedCardLockedContentStyle,
} from '@/utils/feedCardFixedHeight';

type TFn = (key: string, options?: Record<string, string | number>) => string;

type Props = {
  job: Job;
  t: TFn;
};

/** Read-only history card for cancelled / expired client listings. */
export function ClientHistoryClosedCard({ job, t }: Props) {
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const CategoryIcon = getCategoryIconById(job.category);
  const categoryTheme = getCategoryFeedTheme(job.category);
  const title = translateJobTitle(job.title, job.category, job.subcategory, t);
  const category = translateCategory(job.category, t);
  const expired = isJobExpired(job) || job.status === 'expired';
  const banner = expired
    ? t('client_history.expired_banner')
    : t('client_history.cancelled_banner');

  return (
    <>
      <LhCard
        className={clsx(FEED_CARD_SHELL_CLASS, FEED_CARD_PREMIUM_SHELL_CLASS)}
        data-testid={`client-history-closed-${job.id}`}
      >
        <div
          className={FEED_CARD_TOP_ACCENT_CLASS}
          style={{ backgroundColor: categoryTheme.iconColor }}
        />
        <div
          className={clsx(FEED_CARD_CONTENT_CLASS, FEED_CARD_PREMIUM_SURFACE_CLASS)}
          style={feedCardLockedContentStyle()}
        >
          <div className="flex min-h-[var(--feed-card-standard-content-height,140px)] flex-col" style={{ minHeight: FEED_CARD_STANDARD_CONTENT_HEIGHT_PX }}>
            <div className="flex items-start gap-3">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                style={{
                  backgroundColor: categoryTheme.iconBg,
                  color: categoryTheme.iconColor,
                }}
              >
                <CategoryIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className={FEED_CARD_PREMIUM_MUTED_CLASS}>{category}</p>
                <h3 className={clsx(FEED_CARD_PREMIUM_TITLE_CLASS, 'truncate whitespace-nowrap')}>{title}</h3>
                <p className="mt-1 truncate whitespace-nowrap text-sm font-bold text-slate-800">
                  {formatJobBudgetAmount(job, t)}
                </p>
              </div>
            </div>

            <div
              className={clsx(
                'mt-3 rounded-xl px-3 py-2 text-[11px] font-bold',
                expired ? 'bg-amber-50 text-amber-900' : 'bg-slate-100 text-slate-700',
              )}
            >
              {banner}
            </div>

            <div className="mt-auto flex items-center justify-between gap-2 pt-3">
              <button
                type="button"
                onClick={() => setDescriptionOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-black text-slate-600 transition hover:text-slate-900"
                data-testid={`client-history-closed-description-${job.id}`}
              >
                <Icons.FileText className="h-3.5 w-3.5" />
                {t('common.description')}
              </button>
            </div>
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
        <div className={clsx(FEED_CARD_PREMIUM_SCROLL_CLASS, FEED_CARD_PREMIUM_BODY_CLASS)}>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
            {job.description?.trim() || t('helper_dashboard.feed_card_no_description')}
          </p>
        </div>
      </LhCardOverlay>
    </>
  );
}
