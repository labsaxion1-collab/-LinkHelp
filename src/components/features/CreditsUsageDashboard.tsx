import { useLanguage } from '@/context/LanguageContext';
import { formatLinkCredits } from '@/utils/formatLinkCredits';
import { MOCK_CREDITS_USAGE } from '@/config/creditsUsageConfig';
import * as Icons from 'lucide-react';

type Props = { className?: string };

const STATS_META = [
  { key: 'lc_used' as const, icon: Icons.TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { key: 'lc_returned' as const, icon: Icons.RefreshCw, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { key: 'response_rate' as const, icon: Icons.PieChart, color: 'text-violet-400', bg: 'bg-violet-500/10' },
  { key: 'unlocks' as const, icon: Icons.Users, color: 'text-amber-400', bg: 'bg-amber-500/10' },
];

export function CreditsUsageDashboard({ className = '' }: Props) {
  const { t, language } = useLanguage();
  const m = MOCK_CREDITS_USAGE;

  const values = [
    formatLinkCredits(m.lcUsed, language),
    formatLinkCredits(m.lcReturned, language),
    `${m.responseRatePct}%`,
    String(m.leadsUnlocked),
  ];

  return (
    <section
      className={`rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 backdrop-blur-sm ${className}`}
    >
      <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-blue-400">
        {t('credits_usage.title')}
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {STATS_META.map((meta, i) => {
          const Icon = meta.icon;
          return (
            <div
              key={meta.key}
              className="flex flex-col items-center gap-2 rounded-xl border border-white/[0.05] bg-white/[0.03] px-3 py-3 text-center"
            >
              <span className={`flex h-8 w-8 items-center justify-center rounded-full ${meta.bg}`}>
                <Icon className={`h-4 w-4 ${meta.color}`} />
              </span>
              <p className="text-[10px] font-bold uppercase leading-tight text-slate-500">
                {t(`credits_usage.${meta.key}`)}
              </p>
              <p className="text-lg font-black tabular-nums text-white">{values[i]}</p>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[10px] font-medium text-slate-600">{t('credits_usage.disclaimer')}</p>
    </section>
  );
}
