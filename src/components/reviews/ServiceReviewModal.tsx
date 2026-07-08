import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { LhModal } from '@/components/design-system/LhModal';
import { StarRatingInput } from '@/components/reviews/StarRatingInput';
import type { PendingServiceReview } from '@/types/review';
import { resolveReviewSubmitErrorMessage } from '@/utils/reviewSubmitErrors';
import { translateJobTitle } from '@/utils/translateCategory';

type Props = {
  open: boolean;
  pending: PendingServiceReview | null;
  reviewerRole: 'client' | 'helper';
  onClose: () => void;
  onSubmit: (input: { rating: number; comment: string }) => Promise<void>;
  t: (key: string, options?: Record<string, string | number>) => string;
};

export function ServiceReviewModal({ open, pending, reviewerRole, onClose, onSubmit, t }: Props) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setRating(0);
    setComment('');
    setError('');
    setSubmitting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!pending || rating < 1) {
      setError(t('service_review.rating_required'));
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onSubmit({ rating, comment: comment.trim() });
      reset();
      onClose();
    } catch (error) {
      console.error('[LinkHelp] review modal submit', error);
      setError(resolveReviewSubmitErrorMessage(error, t));
      setSubmitting(false);
    }
  };

  if (!open || !pending) return null;

  const titleKey = reviewerRole === 'client' ? 'service_review.title_client' : 'service_review.title_helper';

  return (
    <LhModal open={open} onClose={handleClose} title={t(titleKey)} size="md">
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
          <img src={pending.targetAvatar} alt="" className="h-12 w-12 rounded-xl object-cover ring-2 ring-white" />
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-slate-950">{pending.targetName}</p>
            <p className="truncate text-xs font-semibold text-slate-500">
              {translateJobTitle(pending.jobTitle, pending.jobCategory, pending.jobSubcategory ?? null, t)}
            </p>
          </div>
        </div>


        <p className="text-center text-sm font-medium text-slate-600">{t('service_review.prompt')}</p>

        <StarRatingInput value={rating} onChange={setRating} disabled={submitting} />

        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
            {t('service_review.comment_label')}
          </span>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder={t('service_review.comment_placeholder')}
            className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-blue-500"
          />
        </label>

        {error ? <p className="text-center text-xs font-bold text-red-600">{error}</p> : null}

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="min-h-[44px] flex-1 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            {t('service_review.later')}
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting || rating < 1}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t('service_review.submit')}
          </button>
        </div>
      </div>
    </LhModal>
  );
}
