import { useLanguage } from '@/context/LanguageContext';
import { formatLinkCredits } from '@/utils/formatLinkCredits';
import { MOCK_CREDITS_USAGE } from '@/config/creditsUsageConfig';

type Props = { className?: string };

export function CreditsUsageDashboard({ className = '' }: Props) {
  const { t, language } = useLanguage();
  const m = MOCK_CREDITS_USAGE;

  return (
    <section className={`rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50/30 p-4 ${className}`}>
      <p className="text-[10px] font-black uppercase tracking-wide text-blue-600">{t('credits_usage.title')}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label={t('credits_usage.lc_used')} value={formatLinkCredits(m.lcUsed, language)} />
        <Stat label={t('credits_usage.lc_returned')} value={formatLinkCredits(m.lcReturned, language)} />
        <Stat label={t('credits_usage.response_rate')} value={`${m.responseRatePct}%`} />
        <Stat label={t('credits_usage.unlocks')} value={String(m.leadsUnlocked)} />
      </div>
      <p className="mt-3 text-xs font-medium text-slate-500">{t('credits_usage.disclaimer')}</p>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white/90 px-3 py-2.5 text-center">
      <p className="text-[10px] font-bold uppercase text-slate-400">{label}</p>
      <p className="mt-0.5 text-lg font-black tabular-nums text-slate-950">{value}</p>
    </div>
  );
}
