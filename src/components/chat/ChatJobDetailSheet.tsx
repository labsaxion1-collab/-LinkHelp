import * as Icons from 'lucide-react';
import type { Job } from '@/types/job';
import { useLanguage } from '@/context/LanguageContext';
import { ChatThreadSheetFrame } from '@/components/chat/ChatThreadSheetFrame';
import { formatJobBudgetDisplay } from '@/utils/formatJobBudget';
import { formatJobScheduleDisplay } from '@/utils/jobDisplay';
import { translateCategory, translateJobTitle } from '@/utils/translateCategory';

type Props = {
  job: Job | null;
  open: boolean;
  onClose: () => void;
};

function formatCreatedDate(createdAtMs: number, locale: string): string {
  if (!Number.isFinite(createdAtMs) || createdAtMs <= 0) return '—';
  return new Date(createdAtMs).toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatCreatedTime(createdAtMs: number, locale: string): string {
  if (!Number.isFinite(createdAtMs) || createdAtMs <= 0) return '—';
  return new Date(createdAtMs).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDesiredDate(job: Job, t: (key: string) => string): string {
  if (job.preferredDate) {
    try {
      const d = new Date(`${job.preferredDate}T12:00:00`);
      return d.toLocaleDateString(undefined, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return job.preferredDate;
    }
  }
  const schedule = formatJobScheduleDisplay(job, t);
  return schedule || '—';
}

function formatDesiredTime(job: Job, t: (key: string) => string): string {
  const exact = job.preferredTime?.trim();
  if (exact) return exact;
  const period = job.preferredPeriod ?? job.preferredTimeWindow;
  if (period === 'morning') return t('create_modal.time_morning');
  if (period === 'afternoon') return t('create_modal.time_afternoon');
  if (period === 'evening') return t('create_modal.time_evening');
  if (period) return period;
  return '—';
}

function formatApproxLocation(job: Job, t: (key: string) => string): string {
  const parts = [job.city, job.region, job.location].filter(Boolean);
  const unique = [...new Set(parts.map((p) => p!.trim()))];
  if (unique.length) return unique.join(' · ');
  return job.location?.trim() || t('jobs.remote');
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm font-semibold leading-snug text-slate-900">{value}</p>
    </div>
  );
}

export function ChatJobDetailSheet({ job, open, onClose }: Props) {
  const { t, language } = useLanguage();

  if (!open || !job) return null;

  const locale = language === 'en' ? 'en-CA' : language === 'fr' ? 'fr-CA' : 'pt-BR';
  const category = translateCategory(job.category, t);
  const title = translateJobTitle(job.title, job.category, job.subcategory, t);
  const budget = formatJobBudgetDisplay(job, t);
  const photos = (job as Job & { photos?: string[] }).photos?.filter(Boolean) ?? [];

  return (
    <ChatThreadSheetFrame open={open} onClose={onClose} titleId="chat-job-detail-title">
      <header className="flex shrink-0 items-center justify-between border-b border-blue-100/80 bg-gradient-to-r from-[#EAF7FF] via-white to-[#DFF4FF] px-4 py-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
              {t('messages_page.job_detail_modal_title')}
            </p>
            <h2 id="chat-job-detail-title" className="truncate text-base font-black text-[#0D1B2A]">
              {category}: {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-2 shrink-0 rounded-full bg-white/80 p-2 text-slate-500 hover:bg-white hover:text-slate-800"
            aria-label={t('common.close')}
          >
            <Icons.X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-4 py-4">
          <DetailRow label={t('messages_page.job_detail_category')} value={category} />
          <DetailRow label={t('messages_page.job_detail_title')} value={title} />
          <DetailRow
            label={t('messages_page.job_detail_description')}
            value={job.description?.trim() || '—'}
          />
          <div className="grid grid-cols-2 gap-2">
            <DetailRow
              label={t('messages_page.job_detail_created_date')}
              value={formatCreatedDate(job.createdAt, locale)}
            />
            <DetailRow
              label={t('messages_page.job_detail_created_time')}
              value={formatCreatedTime(job.createdAt, locale)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <DetailRow label={t('messages_page.job_detail_desired_date')} value={formatDesiredDate(job, t)} />
            <DetailRow label={t('messages_page.job_detail_desired_time')} value={formatDesiredTime(job, t)} />
          </div>
          <DetailRow label={t('messages_page.job_detail_location')} value={formatApproxLocation(job, t)} />
          <DetailRow label={t('messages_page.job_detail_budget')} value={budget} />

          {photos.length > 0 ? (
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                {t('messages_page.job_detail_photos')}
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {photos.map((url) => (
                  <img
                    key={url}
                    src={url}
                    alt=""
                    className="aspect-[4/3] w-full rounded-xl border border-white object-cover shadow-sm"
                    loading="lazy"
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <footer className="shrink-0 border-t border-slate-100 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[48px] w-full items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-800 hover:bg-slate-50 transition-colors"
          >
            {t('messages_page.understood')}
          </button>
        </footer>
    </ChatThreadSheetFrame>
  );
}
