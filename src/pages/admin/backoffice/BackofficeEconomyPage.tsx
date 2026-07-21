import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { backofficeFetch, BackofficeApiError } from '@/backoffice/api/backofficeClient';
import { buildEconomySnapshot, type EconomySnapshot } from '@/backoffice/economy/economySnapshot';
import { BackofficePageShell } from '@/backoffice/components/BackofficePageShell';
import { useLanguage } from '@/context/LanguageContext';

type EconomyApiResponse = EconomySnapshot & { dbPackages?: unknown[] };

export default function BackofficeEconomyPage() {
  const { session } = useAuth();
  const { t } = useLanguage();
  const [snapshot, setSnapshot] = useState<EconomyApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = session?.access_token;
    if (!token) {
      setSnapshot({ ...buildEconomySnapshot(), dbPackages: [] });
      return;
    }
    void backofficeFetch<EconomyApiResponse>(token, '/api/backoffice/economy')
      .then(setSnapshot)
      .catch((e: unknown) => {
        setError(e instanceof BackofficeApiError ? e.code : 'BACKOFFICE_UNAVAILABLE');
        setSnapshot({ ...buildEconomySnapshot(), dbPackages: [] });
      });
  }, [session?.access_token]);

  const data = snapshot ?? buildEconomySnapshot();

  return (
    <BackofficePageShell title={t('backoffice.economy_title')} subtitle={t('backoffice.economy_subtitle')}>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      <p className="text-xs text-amber-300/90">{t('backoffice.economy_readonly_note')}</p>
      <section className="border border-white/10 bg-white/[0.02] p-4">
        <h3 className="text-sm font-black text-white">{t('backoffice.packages_section')}</h3>
        <ul className="mt-3 space-y-2 text-sm text-slate-300">
          {data.packages.map((p) => (
            <li key={p.id}>
              {p.id}: {p.credits} LC — CAD ${p.priceCad.toFixed(2)}
            </li>
          ))}
        </ul>
      </section>
      <section className="border border-white/10 bg-white/[0.02] p-4 text-sm text-slate-300">
        <h3 className="font-black text-white">{t('backoffice.apply_rules_section')}</h3>
        <p className="mt-2">{t('backoffice.normal_apply')}: {data.applyRules.normalApplyLc} LC</p>
        <p>VIP: {data.applyRules.vipApplyFormula}</p>
      </section>
    </BackofficePageShell>
  );
}
