import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import * as Icons from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { UpcomingJob, UpcomingWorkflowStatus } from '@/context/AppDataContext';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { isSupabaseConfigured } from '@/lib/supabase';
import { ensureConversation } from '@/services/supabase/conversationEnsure';
import { remoteUpdateUpcomingWorkflow } from '@/services/supabase/appDataRemote';
import type { Job } from '@/types/job';
import { ROUTES } from '@/utils/constants';
import { clsx } from 'clsx';
import { getCategoryFeedTheme } from '@/utils/categoryFeedTheme';

interface UpcomingJobDetailModalProps {
  job: UpcomingJob | null;
  open: boolean;
  onClose: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  translateCategory: (raw: string, tf: (k: string) => string) => string;
  locale: string;
  onUpdateWorkflow: (id: string, status: UpcomingWorkflowStatus) => void;
}

function statusBadgeClass(s: UpcomingWorkflowStatus): string {
  switch (s) {
    case 'scheduled':
    case 'completed':
      return 'border-emerald-200 bg-[#ECFDF5] text-[#16A34A]';
    case 'in_progress':
    case 'arriving':
    case 'awaiting_client_confirmation':
      return 'border-blue-200 bg-[#EFF6FF] text-[#2563EB]';
    case 'cancelled':
      return 'border-red-200 bg-[#FEF2F2] text-[#DC2626]';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-700';
  }
}

function statusLabel(s: UpcomingWorkflowStatus, t: (key: string) => string): string {
  const map: Record<UpcomingWorkflowStatus, string> = {
    scheduled: 'upcoming_jobs.status_scheduled',
    in_progress: 'upcoming_jobs.status_in_progress',
    arriving: 'upcoming_jobs.status_arriving',
    awaiting_client_confirmation: 'upcoming_jobs.status_awaiting_client_confirmation',
    completed: 'upcoming_jobs.status_completed',
    cancelled: 'upcoming_jobs.status_cancelled',
  };
  return t(map[s]);
}

function buildMapsUrl(requestJob: Job | undefined, fallbackLocation: string): string {
  const lat = requestJob?.latitude;
  const lng = requestJob?.longitude;
  if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }
  const address =
    requestJob?.address?.trim() ||
    [requestJob?.address, requestJob?.city, requestJob?.region, requestJob?.postalCode]
      .filter(Boolean)
      .join(', ')
      .trim() ||
    requestJob?.location?.trim() ||
    fallbackLocation;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function formatPaymentDisplay(job: UpcomingJob, requestJob: Job | undefined, t: (key: string) => string): string {
  const raw = job.value?.trim();
  if (!raw || raw === '—' || raw === '-') return t('upcoming_jobs.payment_to_arrange');

  if (requestJob?.acceptedAmount != null) {
    const cur = requestJob.currency?.trim() || 'CAD $';
    return `${cur} $${requestJob.acceptedAmount}`;
  }
  if (requestJob?.budgetAmount != null && requestJob.budgetType === 'fixed') {
    const cur = requestJob.currency?.trim() || 'CAD $';
    return `${cur} $${requestJob.budgetAmount}`;
  }
  if (raw.includes('$') || /CAD|USD|EUR/i.test(raw)) return raw;
  const cur = requestJob?.currency?.trim() || 'CAD $';
  return `${cur} $${raw}`;
}

function displayLocation(job: UpcomingJob, requestJob: Job | undefined): string {
  const fromJob =
    requestJob?.address?.trim() ||
    [requestJob?.address, requestJob?.city, requestJob?.region, requestJob?.postalCode]
      .filter(Boolean)
      .join(', ')
      .trim();
  return fromJob || requestJob?.location?.trim() || job.location?.trim() || '—';
}

const sectionCard =
  'rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:p-[18px] transition-colors';
const sectionLabel = 'text-[11px] font-bold uppercase tracking-[0.06em] text-[#64748B]';

export function UpcomingJobDetailModal({
  job,
  open,
  onClose,
  t,
  translateCategory,
  onUpdateWorkflow,
}: UpcomingJobDetailModalProps) {
  const navigate = useNavigate();
  const { jobs } = useAppData();
  const { session } = useAuth();
  const { showToast } = useToast();
  const [chatLoading, setChatLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  const requestJob = useMemo(
    () => (job ? jobs.find((j) => j.id === job.jobId) : undefined),
    [job, jobs],
  );

  if (!open || !job) return null;

  const mapsUrl = buildMapsUrl(requestJob, job.location);
  const locationText = displayLocation(job, requestJob);
  const paymentText = formatPaymentDisplay(job, requestJob, t);
  const hasPayment = paymentText !== t('upcoming_jobs.payment_to_arrange');
  const observations = job.description?.trim();
  const categoryLabel = translateCategory(job.category, t);
  const categoryTheme = getCategoryFeedTheme(job.category);

  const canCancel =
    job.workflowStatus !== 'completed' &&
    job.workflowStatus !== 'cancelled' &&
    job.workflowStatus !== 'awaiting_client_confirmation';

  const handleOpenChat = async () => {
    if (!requestJob?.clientId || chatLoading) return;
    const helperId = job.helperId || session?.user?.id;
    if (!helperId) {
      showToast(t('upcoming_jobs.open_chat_error'), 'error');
      return;
    }

    setChatLoading(true);
    try {
      const conversationId = await ensureConversation({
        requestId: job.jobId,
        clientId: requestJob.clientId,
        helperId,
        contactUnlocked: true,
      });
      navigate(`${ROUTES.messages}?c=${encodeURIComponent(conversationId)}`);
      onClose();
    } catch (e) {
      console.error('[LinkHelp] open job chat', e);
      showToast(t('upcoming_jobs.open_chat_error'), 'error');
    } finally {
      setChatLoading(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (cancelLoading) return;
    setCancelLoading(true);
    try {
      if (isSupabaseConfigured()) {
        await remoteUpdateUpcomingWorkflow(job.id, 'cancelled');
      }
      onUpdateWorkflow(job.id, 'cancelled');
      showToast(t('upcoming_jobs.cancel_job_success'), 'success');
      setCancelConfirmOpen(false);
      onClose();
    } catch (e) {
      console.error('[LinkHelp] cancel upcoming job', e);
      showToast(t('upcoming_jobs.cancel_job_error'), 'error');
    } finally {
      setCancelLoading(false);
    }
  };

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex animate-in fade-in items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px] duration-200"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="upcoming-job-detail-title"
        className="max-h-[min(92vh,900px)] w-full max-w-[430px] animate-in zoom-in-95 overflow-y-auto rounded-[28px] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] duration-200 sm:max-w-[520px] sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB]">
              <Icons.Briefcase className="h-5 w-5" strokeWidth={2.25} />
            </div>
            <h2
              id="upcoming-job-detail-title"
              className="text-[22px] font-bold leading-tight text-[#0F172A] sm:text-[24px]"
            >
              {t('upcoming_jobs.modal_title')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white text-[#64748B] transition-colors duration-200 hover:bg-[#F8FAFC] hover:text-[#0F172A]"
            aria-label="Close"
          >
            <Icons.X className="h-5 w-5" />
          </button>
        </div>

        {/* Job header */}
        <div className="mb-6 flex items-start gap-4">
          <img
            src={job.clientAvatar}
            alt=""
            className="h-14 w-14 shrink-0 rounded-full border-2 border-[#E2E8F0] object-cover"
          />
          <div className="min-w-0 flex-1">
            <p
              className="inline-flex rounded-xl px-2.5 py-1 text-lg font-bold leading-snug sm:text-xl"
              style={{ color: categoryTheme.iconColor, backgroundColor: categoryTheme.iconBg }}
            >
              {categoryLabel}
            </p>
            <p className="mt-1 text-[15px] font-medium text-[#64748B]">
              {t('upcoming_jobs.client_label', { name: job.clientName })}
            </p>
            <span
              className={clsx(
                'mt-2.5 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold',
                statusBadgeClass(job.workflowStatus),
              )}
            >
              {(job.workflowStatus === 'scheduled' || job.workflowStatus === 'completed') && (
                <Icons.Check className="h-3.5 w-3.5" strokeWidth={2.5} />
              )}
              {statusLabel(job.workflowStatus, t)}
            </span>
          </div>
        </div>

        <div className="space-y-5 sm:space-y-6">
          {/* Location */}
          <section className={sectionCard}>
            <p className={sectionLabel}>{t('upcoming_jobs.location')}</p>
            <div className="mt-3 flex items-start gap-2.5">
              <Icons.MapPin className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[#2563EB]" strokeWidth={2.25} />
              <p className="min-w-0 break-words text-[15px] font-medium leading-relaxed text-[#0F172A] sm:text-base">
                {locationText}
              </p>
            </div>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[#2563EB] transition-colors duration-200 hover:text-[#1A73E8]"
            >
              <Icons.Map className="h-4 w-4" />
              {t('upcoming_jobs.view_location')}
            </a>
          </section>

          {/* Payment */}
          <section className={clsx(sectionCard, 'flex items-center justify-between gap-4')}>
            <div className="min-w-0">
              <p className={sectionLabel}>{t('upcoming_jobs.payment_est')}</p>
              <p
                className={clsx(
                  'mt-2 text-[22px] font-bold leading-tight sm:text-[24px]',
                  hasPayment ? 'text-[#059669]' : 'text-[#64748B]',
                )}
              >
                {paymentText}
              </p>
            </div>
            <div
              className={clsx(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
                hasPayment ? 'bg-[#ECFDF5] text-[#16A34A]' : 'bg-[#F8FAFC] text-[#64748B]',
              )}
            >
              <Icons.DollarSign className="h-5 w-5" strokeWidth={2.25} />
            </div>
          </section>

          {/* Details */}
          <section className={clsx(sectionCard, 'flex items-start justify-between gap-4')}>
            <div className="min-w-0 flex-1">
              <p className={sectionLabel}>{t('upcoming_jobs.details')}</p>
              <p
                className={clsx(
                  'mt-2 text-[15px] leading-relaxed sm:text-base',
                  observations ? 'font-medium text-[#0F172A]' : 'font-medium text-[#64748B]',
                )}
              >
                {observations || t('upcoming_jobs.no_observations')}
              </p>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EFF6FF] text-[#2563EB]">
              <Icons.FileText className="h-5 w-5" strokeWidth={2.25} />
            </div>
          </section>
        </div>

        {/* Footer */}
        {job.workflowStatus !== 'cancelled' ? (
          <div className={clsx('mt-6 gap-3', canCancel ? 'grid grid-cols-2' : 'grid grid-cols-1')}>
            <button
              type="button"
              disabled={chatLoading || cancelLoading}
              onClick={() => void handleOpenChat()}
              className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-[#BFDBFE] bg-white px-3 text-sm font-bold text-[#2563EB] transition-all duration-200 hover:border-[#93C5FD] hover:bg-[#EFF6FF] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {chatLoading ? (
                <Icons.Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Icons.MessageCircle className="h-4 w-4" />
              )}
              {t('upcoming_jobs.open_chat')}
            </button>

            {canCancel ? (
              <button
                type="button"
                disabled={chatLoading || cancelLoading}
                onClick={() => setCancelConfirmOpen(true)}
                className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-red-200 bg-[#FEF2F2] px-3 text-sm font-bold text-[#DC2626] transition-all duration-200 hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Icons.XCircle className="h-4 w-4" />
                {t('upcoming_jobs.cancel_job')}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );

  const cancelConfirm = cancelConfirmOpen ? (
    <div
      className="fixed inset-0 z-[110] flex animate-in fade-in items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-job-title"
      onClick={() => !cancelLoading && setCancelConfirmOpen(false)}
    >
      <div
        className="w-full max-w-md animate-in zoom-in-95 rounded-[28px] border border-[#E2E8F0] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.12)] duration-200 sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="cancel-job-title" className="text-lg font-bold text-[#0F172A]">
          {t('upcoming_jobs.cancel_job_confirm_title')}
        </h3>
        <p className="mt-2 text-sm font-medium leading-relaxed text-[#64748B]">
          {t('upcoming_jobs.cancel_job_confirm_body')}
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={cancelLoading}
            onClick={() => setCancelConfirmOpen(false)}
            className="min-h-[44px] rounded-xl border border-[#E2E8F0] bg-white px-4 text-sm font-bold text-[#0F172A] transition-colors duration-200 hover:bg-[#F8FAFC] disabled:opacity-60"
          >
            {t('upcoming_jobs.cancel_job_confirm_back')}
          </button>
          <button
            type="button"
            disabled={cancelLoading}
            onClick={() => void handleConfirmCancel()}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#DC2626] px-4 text-sm font-bold text-white transition-colors duration-200 hover:bg-red-700 disabled:opacity-60"
          >
            {cancelLoading ? <Icons.Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t('upcoming_jobs.cancel_job_confirm_submit')}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return createPortal(
    <>
      {modal}
      {cancelConfirm}
    </>,
    document.body,
  );
}
