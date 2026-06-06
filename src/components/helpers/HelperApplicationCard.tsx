import * as Icons from 'lucide-react';
import { Clock, MapPin } from 'lucide-react';
import type { Application } from '@/types/application';
import type { Job } from '@/types/job';
import { LhCard } from '@/components/design-system';
import { translateCategory, translateJobTitle } from '@/utils/translateCategory';
import { formatJobScheduleDisplay } from '@/utils/jobDisplay';

type Props = {
  app: Application;
  job: Job;
  t: (key: string, vars?: Record<string, string | number>) => string;
  onOpenDetails?: () => void;
  onCancel?: () => void;
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  viewed: 'bg-blue-50 text-blue-700 border-blue-200',
  accepted: 'bg-green-50 text-green-700 border-green-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  completed: 'bg-purple-50 text-purple-700 border-purple-200',
  cancelled: 'bg-slate-100 text-slate-600 border-slate-200',
};

export function HelperApplicationCard({ app, job, t, onOpenDetails, onCancel }: Props) {
  const statusTexts: Record<string, string> = {
    pending: t('helper_dashboard.app_pending'),
    viewed: t('helper_dashboard.app_viewed'),
    accepted: t('helper_dashboard.app_accepted'),
    rejected: t('helper_dashboard.app_rejected'),
    completed: t('helper_dashboard.app_completed'),
    cancelled: t('helper_dashboard.app_cancelled'),
  };

  return (
    <LhCard padding="none" className="overflow-hidden transition-shadow duration-200 hover:shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-50 bg-gray-50/50 p-4">
        <div className="flex items-center gap-2">
          <Icons.Clock className="h-4 w-4 text-gray-500" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600">
            {new Date(app.createdAt).toLocaleDateString()}
          </span>
        </div>
        <div
          className={`rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${STATUS_COLORS[app.status] ?? 'border-slate-200 bg-slate-50 text-slate-600'}`}
        >
          {statusTexts[app.status] ?? app.status}
        </div>
      </div>
      <button
        type="button"
        onClick={onOpenDetails}
        disabled={!onOpenDetails}
        className="w-full p-5 text-left disabled:cursor-default"
      >
        <div className="mb-4 flex items-center gap-3">
          <img
            src={job.clientAvatar}
            alt=""
            className="h-10 w-10 rounded-full border-2 border-white object-cover shadow-sm"
          />
          <div>
            <h3 className="font-bold leading-tight text-gray-900">{job.clientName}</h3>
            <p className="text-xs font-medium text-gray-400">{translateCategory(job.category, t)}</p>
          </div>
        </div>
        <h4 className="mb-3 text-lg font-bold leading-tight text-gray-900">
          {translateJobTitle(job.title, job.category, job.subcategory, t)}
        </h4>
        <div className="mb-2 flex flex-wrap gap-2 text-sm text-gray-500">
          <span className="flex items-center gap-1.5 rounded-lg border border-gray-100 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-600">
            <Clock className="h-3.5 w-3.5 text-gray-400" /> {formatJobScheduleDisplay(job, t)}
          </span>
          <span className="flex items-center gap-1.5 rounded-lg border border-gray-100 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-600">
            <MapPin className="h-3.5 w-3.5 text-gray-400" /> {job.location}
          </span>
          <span className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
            <Icons.Handshake className="h-3.5 w-3.5 shrink-0 text-slate-500" />{' '}
            {t('helper_dashboard.compensation_neutral')}
          </span>
        </div>
      </button>
      {(app.status === 'pending' || app.status === 'viewed') && onCancel && (
        <div className="flex justify-end border-t border-gray-100 px-5 pb-5 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100"
          >
            <Icons.XCircle className="h-4 w-4" />
            {t('helper_dashboard.cancel_application')}
          </button>
        </div>
      )}
    </LhCard>
  );
}
