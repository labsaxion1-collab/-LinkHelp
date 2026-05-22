import React from 'react';
import * as Icons from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { UpcomingJob, UpcomingWorkflowStatus } from '@/context/AppDataContext';
import { formatScheduledClock, formatScheduledDay } from '@/utils/upcomingJobUtils';
import { ROUTES } from '@/utils/constants';

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
      return 'bg-sky-100 text-sky-800 border-sky-200';
    case 'in_progress':
      return 'bg-amber-100 text-amber-900 border-amber-200';
    case 'arriving':
      return 'bg-violet-100 text-violet-800 border-violet-200';
    case 'awaiting_client_confirmation':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'completed':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'cancelled':
      return 'bg-gray-100 text-gray-600 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
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
  const urgencyLabel =
    job.urgency === 'high' ? t('upcoming_jobs.urgency_high') : t('upcoming_jobs.urgency_normal');
  const isTerminal =
    job.workflowStatus === 'completed' ||
    job.workflowStatus === 'cancelled' ||
    job.workflowStatus === 'awaiting_client_confirmation';

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center p-0 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity"
        aria-label={t('common.close')}
        onClick={onClose}
      />
      <div className="relative bg-white w-full sm:max-w-lg max-h-[92vh] sm:max-h-[90vh] overflow-hidden flex flex-col rounded-t-3xl sm:rounded-3xl shadow-2xl border border-gray-100 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Icons.Briefcase className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{t('upcoming_jobs.modal_title')}</p>
              <h2 className="text-lg font-black text-gray-900 truncate">{job.title}</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors shrink-0"
          >
            <Icons.X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0 px-5 py-5 space-y-5">
          <div className="flex items-start gap-4">
            <img
              src={job.clientAvatar}
              alt=""
              className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-md ring-1 ring-gray-100 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 leading-snug">{t('upcoming_jobs.client_label', { name: job.clientName })}</p>
              <span
                className={`inline-flex mt-2 text-[11px] font-bold px-2.5 py-1 rounded-lg border ${statusBadgeClass(job.workflowStatus)}`}
              >
                {statusLabel(job.workflowStatus, t)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-gray-50 border border-gray-100 p-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{t('upcoming_jobs.category')}</p>
              <p className="text-sm font-bold text-gray-900 leading-tight">{translateCategory(job.category, t)}</p>
            </div>
            <div className="rounded-2xl bg-gray-50 border border-gray-100 p-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{t('upcoming_jobs.date_time')}</p>
              <p className="text-sm font-bold text-gray-900 leading-tight">
                {day} · {clock}
              </p>
            </div>
            <div className="rounded-2xl bg-gray-50 border border-gray-100 p-3 col-span-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{t('upcoming_jobs.location')}</p>
              <p className="text-sm font-bold text-gray-900 leading-tight">{job.location}</p>
            </div>
            <div className="rounded-2xl bg-gray-50 border border-gray-100 p-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{t('upcoming_jobs.payment_est')}</p>
              <p className="text-sm font-bold text-emerald-700 leading-tight">${job.value}</p>
            </div>
            <div className="rounded-2xl bg-gray-50 border border-gray-100 p-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{t('upcoming_jobs.urgency_label')}</p>
              <p className="text-sm font-bold text-gray-900 leading-tight">{urgencyLabel}</p>
            </div>
            <div className="rounded-2xl bg-gray-50 border border-gray-100 p-3 col-span-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{t('upcoming_jobs.details')}</p>
              <p className="text-sm font-medium text-gray-800 leading-snug">{job.description}</p>
            </div>
          </div>

          {!isTerminal && (
            <div className="flex flex-col gap-2.5 pt-1">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigate(ROUTES.messages);
                    onClose();
                  }}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-800 hover:bg-gray-50 transition-colors"
                >
                  <Icons.MessageCircle className="w-4 h-4 text-blue-600" />
                  {t('upcoming_jobs.open_chat')}
                </button>
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-800 hover:bg-gray-50 transition-colors"
                >
                  <Icons.MapPin className="w-4 h-4 text-red-500" />
                  {t('upcoming_jobs.view_location')}
                </a>
              </div>

              {job.workflowStatus === 'scheduled' && (
                <button
                  type="button"
                  onClick={() => onUpdateWorkflow(job.id, 'arriving')}
                  className="w-full py-3 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  <Icons.Navigation className="w-4 h-4" />
                  {t('upcoming_jobs.confirm_arrival')}
                </button>
              )}

              {(job.workflowStatus === 'scheduled' || job.workflowStatus === 'arriving') && (
                <button
                  type="button"
                  onClick={() => onUpdateWorkflow(job.id, 'in_progress')}
                  className="w-full py-3 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  <Icons.Play className="w-4 h-4" />
                  {t('upcoming_jobs.start_work')}
                </button>
              )}

              {(job.workflowStatus === 'in_progress' || job.workflowStatus === 'arriving') && (
                <button
                  type="button"
                  onClick={() => onUpdateWorkflow(job.id, 'awaiting_client_confirmation')}
                  className="w-full py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  <Icons.CheckCircle2 className="w-4 h-4" />
                  {t('upcoming_jobs.mark_completed')}
                </button>
              )}

              <button
                type="button"
                onClick={() => onUpdateWorkflow(job.id, 'cancelled')}
                className="w-full py-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
              >
                <Icons.Ban className="w-4 h-4" />
                {t('upcoming_jobs.cancel_job')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
