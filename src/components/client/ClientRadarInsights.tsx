import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { ROUTES } from '@/utils/constants';
import type { Job } from '@/types/job';
import type { Application } from '@/types/application';
import type { AppNotification } from '@/types/notification';
import { SERVICE_CATEGORIES } from '@/data/serviceCategories';

type TFn = (key: string, options?: Record<string, string | number>) => string;

type Props = {
  t: TFn;
  clientId: string;
  jobs: Job[];
  applications: Application[];
  notifications: AppNotification[];
};

export function ClientRadarInsights({ t, clientId, jobs, applications, notifications }: Props) {
  const myJobs = jobs.filter((j) => j.clientId === clientId);
  const myJobIds = new Set(myJobs.map((j) => j.id));
  const relApps = applications.filter((a) => myJobIds.has(a.jobId) && a.status !== 'cancelled');
  const recentApps = [...relApps].sort((a, b) => b.createdAt - a.createdAt).slice(0, 4);
  const recentNotifs = [...notifications]
    .filter((n) => n.userId === clientId)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 4);
  const hotCats = SERVICE_CATEGORIES.slice(0, 4);

  return (
    <div className="space-y-3 border-t border-gray-100 bg-gradient-to-b from-slate-50/40 to-white p-3">
      <div>
        <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-slate-600">
          <Icons.Activity className="h-3.5 w-3.5 text-blue-500" />
          {t('client_dashboard.radar_recent_title')}
        </h4>
        <ul className="space-y-2">
          {recentApps.length === 0 && recentNotifs.length === 0 ? (
            <li className="rounded-lg border border-dashed border-slate-200 bg-white/80 px-2 py-2 text-[11px] font-medium text-slate-500">
              {t('client_dashboard.radar_recent_empty')}
            </li>
          ) : null}
          {recentApps.map((a) => {
            const job = myJobs.find((j) => j.id === a.jobId);
            return (
              <li
                key={a.id}
                className="flex items-center gap-2 rounded-lg border border-slate-100 bg-white px-2 py-1.5 text-[11px] shadow-sm transition hover:border-blue-100 hover:shadow-md"
              >
                <img src={a.helperAvatar} alt="" className="h-7 w-7 rounded-full object-cover ring-2 ring-white" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-slate-800">{a.helperName}</p>
                  <p className="truncate text-slate-500">{job?.title ?? '—'}</p>
                </div>
                <span className="shrink-0 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-700">
                  {t('client_dashboard.radar_helper_replied')}
                </span>
              </li>
            );
          })}
          {recentNotifs.slice(0, 2).map((n) => (
            <li
              key={n.id}
              className="flex items-start gap-2 rounded-lg border border-amber-100/80 bg-amber-50/50 px-2 py-1.5 text-[11px]"
            >
              <Icons.Bell className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
              <div className="min-w-0">
                <p className="font-bold text-amber-950">{n.title}</p>
                <p className="truncate text-amber-900/80">{n.message}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-slate-600">
          <Icons.Users className="h-3.5 w-3.5 text-emerald-500" />
          {t('client_dashboard.radar_online_title')}
        </h4>
        <p className="rounded-lg border border-dashed border-slate-200 bg-white/80 px-2 py-3 text-[11px] font-medium text-slate-500">
          {t('client_dashboard.radar_online_empty')}
        </p>
      </div>

      <div>
        <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-slate-600">
          <Icons.TrendingUp className="h-3.5 w-3.5 text-violet-500" />
          {t('client_dashboard.radar_suggestions_title')}
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {hotCats.map((c) => (
            <span
              key={c.id}
              className="rounded-full border border-violet-100 bg-violet-50 px-2 py-1 text-[10px] font-bold text-violet-800"
            >
              {t(`categories.${c.id}`)}
            </span>
          ))}
        </div>
        <Link to={ROUTES.helperOpportunities} className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800">
          {t('client_dashboard.radar_browse_helpers')} <Icons.ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-2.5">
        <h4 className="mb-1.5 flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-sky-900">
          <Icons.Lightbulb className="h-3.5 w-3.5" />
          {t('client_dashboard.radar_tips_title')}
        </h4>
        <ul className="space-y-1 text-[10px] font-medium leading-snug text-sky-950/90">
          <li>• {t('client_dashboard.radar_tip_hire')}</li>
          <li>• {t('client_dashboard.radar_tip_verify')}</li>
        </ul>
      </div>
    </div>
  );
}
