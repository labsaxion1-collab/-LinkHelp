import * as Icons from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { UpcomingJob, UpcomingWorkflowStatus } from '@/context/AppDataContext';
import { formatScheduledClock, formatScheduledDay } from '@/utils/upcomingJobUtils';
import { ROUTES } from '@/utils/constants';
import { LhModal } from '@/components/design-system/LhModal';
import { premium } from '@/components/design-system/premiumClasses';
import { translateJobTitle } from '@/utils/translateCategory';

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
      return 'border-sky-200 bg-sky-50 text-sky-800';
    case 'in_progress':
      return 'border-amber-200 bg-amber-50 text-amber-900';
    case 'arriving':
      return 'border-violet-200 bg-violet-50 text-violet-800';
    case 'awaiting_client_confirmation':
      return 'border-blue-200 bg-blue-50 text-blue-800';
    case 'completed':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    case 'cancelled':
      return 'border-slate-200 bg-slate-100 text-slate-600';
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

const statCell = 'rounded-2xl border border-sky-100 bg-white/80 p-3 shadow-sm';

export function UpcomingJobDetailModal({
  job,
  open,
  onClose,
  t,
  translateCategory,
  locale,
  onUpdateWorkflow,
}: UpcomingJobDetailModalProps) {
  const navigate = useNavigate();

  if (!open || !job) return null;

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.location)}`;
  const day = formatScheduledDay(job.scheduledAt, locale);
  const clock = formatScheduledClock(job.scheduledAt, locale);
  const translatedTitle = translateJobTitle(job.title, job.category, null, t);
  const urgencyLabel =
    job.urgency === 'high' ? t('upcoming_jobs.urgency_high') : t('upcoming_jobs.urgency_normal');
  const isTerminal =
    job.workflowStatus === 'completed' ||
    job.workflowStatus === 'cancelled' ||
    job.workflowStatus === 'awaiting_client_confirmation';

  const title = (
    <div className="flex items-center gap-2 min-w-0">
      <div className="lh-icon-chip shrink-0 !h-10 !w-10">
        <Icons.Briefcase className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">{t('upcoming_jobs.modal_title')}</p>
        <p className="truncate text-base font-black text-slate-950">{translatedTitle}</p>
      </div>
    </div>
  );

  return (
    <LhModal open={open} onClose={onClose} title={title} size="md" className="max-w-lg">
      <div className="space-y-5">
        <div className="flex items-start gap-4">
          <img
            src={job.clientAvatar}
            alt=""
            className="h-14 w-14 shrink-0 rounded-2xl border-2 border-[#33B6FF]/20 object-cover shadow-md"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold leading-snug text-slate-900">
              {t('upcoming_jobs.client_label', { name: job.clientName })}
            </p>
            <span
              className={`mt-2 inline-flex rounded-lg border px-2.5 py-1 text-[11px] font-bold ${statusBadgeClass(job.workflowStatus)}`}
            >
              {statusLabel(job.workflowStatus, t)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className={statCell}>
            <p className="mb-1 text-[10px] font-bold uppercase text-slate-500">{t('upcoming_jobs.category')}</p>
            <p className="text-sm font-bold leading-tight text-slate-950">{translateCategory(job.category, t)}</p>
          </div>
          <div className={statCell}>
            <p className="mb-1 text-[10px] font-bold uppercase text-slate-500">{t('upcoming_jobs.date_time')}</p>
            <p className="text-sm font-bold leading-tight text-slate-950">
              {day} · {clock}
            </p>
          </div>
          <div className={`${statCell} col-span-2`}>
            <p className="mb-1 text-[10px] font-bold uppercase text-slate-500">{t('upcoming_jobs.location')}</p>
            <p className="text-sm font-bold leading-tight text-slate-950">{job.location}</p>
          </div>
          <div className={statCell}>
            <p className="mb-1 text-[10px] font-bold uppercase text-slate-500">{t('upcoming_jobs.payment_est')}</p>
            <p className="text-sm font-bold leading-tight text-emerald-700">${job.value}</p>
          </div>
          <div className={statCell}>
            <p className="mb-1 text-[10px] font-bold uppercase text-slate-500">{t('upcoming_jobs.urgency_label')}</p>
            <p className="text-sm font-bold leading-tight text-slate-950">{urgencyLabel}</p>
          </div>
          <div className={`${statCell} col-span-2`}>
            <p className="mb-1 text-[10px] font-bold uppercase text-slate-500">{t('upcoming_jobs.details')}</p>
            <p className="text-sm font-medium leading-snug text-slate-700">{job.description}</p>
          </div>
        </div>

        {!isTerminal ? (
          <div className="flex flex-col gap-2.5 pt-1">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  navigate(ROUTES.messages);
                  onClose();
                }}
                className={premium.btnSecondary + ' !min-h-[48px] !rounded-xl !text-sm'}
              >
                <Icons.MessageCircle className="h-4 w-4 text-[#33B6FF]" />
                {t('upcoming_jobs.open_chat')}
              </button>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className={premium.btnSecondary + ' !min-h-[48px] !rounded-xl !text-sm'}
              >
                <Icons.MapPin className="h-4 w-4 text-red-400" />
                {t('upcoming_jobs.view_location')}
              </a>
            </div>

            {job.workflowStatus === 'scheduled' ? (
              <button
                type="button"
                onClick={() => onUpdateWorkflow(job.id, 'arriving')}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-violet-500"
              >
                <Icons.Navigation className="h-4 w-4" />
                {t('upcoming_jobs.confirm_arrival')}
              </button>
            ) : null}

            {job.workflowStatus === 'scheduled' || job.workflowStatus === 'arriving' ? (
              <button
                type="button"
                onClick={() => onUpdateWorkflow(job.id, 'in_progress')}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-amber-400"
              >
                <Icons.Play className="h-4 w-4" />
                {t('upcoming_jobs.start_work')}
              </button>
            ) : null}

            {job.workflowStatus === 'in_progress' || job.workflowStatus === 'arriving' ? (
              <button
                type="button"
                onClick={() => onUpdateWorkflow(job.id, 'awaiting_client_confirmation')}
                className={premium.btnPrimary + ' !w-full !rounded-xl'}
              >
                <Icons.CheckCircle2 className="h-4 w-4" />
                {t('upcoming_jobs.mark_completed')}
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => onUpdateWorkflow(job.id, 'cancelled')}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-3 text-sm font-bold text-red-700 transition-colors hover:bg-red-100"
            >
              <Icons.Ban className="h-4 w-4" />
              {t('upcoming_jobs.cancel_job')}
            </button>
          </div>
        ) : null}
      </div>
    </LhModal>
  );
}
