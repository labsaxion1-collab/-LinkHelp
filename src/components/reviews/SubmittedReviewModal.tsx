import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { LhModal } from '@/components/design-system/LhModal';
import { criteriaForRole, type ReviewCriterionKey } from '@/config/reviewCriteria';
import type { ServiceReview } from '@/types/review';
import { translateJobTitle } from '@/utils/translateCategory';

export type SubmittedReviewViewModel = {
  review: ServiceReview;
  targetName: string;
  targetAvatar: string;
  jobTitle: string;
  jobCategory: string;
  jobSubcategory?: string | null;
};

type Props = {
  open: boolean;
  item: SubmittedReviewViewModel | null;
  reviewerRole: 'client' | 'helper';
  onClose: () => void;
  /** Shown when edit is requested but backend update is not available yet. */
  onRequestEdit: () => void;
  t: (key: string, options?: Record<string, string | number>) => string;
};

export function SubmittedReviewModal({
  open,
  item,
  reviewerRole,
  onClose,
  onRequestEdit,
  t,
}: Props) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!open) {
      setReady(false);
      return;
    }
    setReady(true);
  }, [open, item?.review.id]);

  if (!open || !item || !ready) return null;

  const criteria = criteriaForRole(reviewerRole);
  const scores = item.review.criteriaScores ?? {};
  const titleKey =
    reviewerRole === 'client' ? 'service_review.title_client_review' : 'service_review.title_helper_review';

  return (
    <LhModal open={open} onClose={onClose} title={t('service_review.review_submitted')} size="md">
      <div className="space-y-3" data-testid="submitted-review-modal">
        <div className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50 p-2.5">
          <img
            src={item.targetAvatar}
            alt=""
            className="h-10 w-10 rounded-lg object-cover ring-2 ring-white"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-slate-950">{item.targetName}</p>
            <p className="truncate text-xs font-semibold text-slate-500">
              {translateJobTitle(
                item.jobTitle,
                item.jobCategory,
                item.jobSubcategory ?? null,
                t,
              )}
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          {criteria.map((c) => {
            const value = Number(scores[c.key as ReviewCriterionKey] ?? scores[c.key] ?? 0);
            return (
              <div
                key={c.key}
                className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-white px-2.5 py-2"
              >
                <p className="min-w-0 flex-1 truncate text-xs font-bold leading-tight text-slate-800 sm:text-[13px]">
                  {t(c.labelKey)}
                </p>
                <span className="inline-flex shrink-0 items-center gap-0.5 text-xs font-black text-slate-800">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
                  {value >= 1 ? value.toFixed(0) : '—'}
                </span>
              </div>
            );
          })}
        </div>

        <div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            {t('service_review.comment_label')}
          </p>
          <p className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800 whitespace-pre-wrap">
            {item.review.comment?.trim() || t('service_review.no_comment')}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] flex-1 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            {t('common.close')}
          </button>
          <button
            type="button"
            data-testid="submitted-review-edit"
            onClick={onRequestEdit}
            className="min-h-[44px] flex-1 rounded-xl border border-blue-200 bg-blue-50 text-sm font-bold text-blue-800 hover:bg-blue-100"
          >
            {t('service_review.edit_review')}
          </button>
        </div>
      </div>
    </LhModal>
  );
}
