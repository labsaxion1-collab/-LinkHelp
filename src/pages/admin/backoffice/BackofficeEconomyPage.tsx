import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { backofficeFetch, BackofficeApiError } from '@/backoffice/api/backofficeClient';
import { buildEconomySnapshot, type EconomySnapshot } from '@/backoffice/economy/economySnapshot';
import { BackofficePageShell } from '@/backoffice/components/BackofficePageShell';
import { BACKOFFICE_PT, formatBackofficeApiError } from '@/admin/fluxPtCopy';
import { formatCadAmount, formatLc, packageLabelPt } from '@/admin/fluxFormat';

type EconomyApiResponse = EconomySnapshot & { dbPackages?: unknown[] };

export default function BackofficeEconomyPage() {
  const { session } = useAuth();
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
        setError(formatBackofficeApiError(e instanceof BackofficeApiError ? e.code : 'BACKOFFICE_UNAVAILABLE'));
        setSnapshot({ ...buildEconomySnapshot(), dbPackages: [] });
      });
  }, [session?.access_token]);

  const data = snapshot ?? buildEconomySnapshot();

  return (
    <BackofficePageShell title={BACKOFFICE_PT.economyTitle} subtitle={BACKOFFICE_PT.economySubtitle}>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      <p className="text-xs text-amber-300/90">{BACKOFFICE_PT.economyReadonlyNote}</p>
      <section className="border border-white/10 bg-white/[0.02] p-4">
        <h3 className="text-sm font-black text-white">{BACKOFFICE_PT.packagesSection}</h3>
        <ul className="mt-3 space-y-2 text-sm text-slate-300">
          {data.packages.map((p) => (
            <li key={p.id}>
              {packageLabelPt(p.id)}: {formatLc(p.credits)} — {formatCadAmount(p.priceCad)}
            </li>
          ))}
        </ul>
      </section>
      <section className="border border-white/10 bg-white/[0.02] p-4 text-sm text-slate-300">
        <h3 className="font-black text-white">{BACKOFFICE_PT.applyRulesSection}</h3>
        <p className="mt-2">
          {BACKOFFICE_PT.normalApply}: {formatLc(data.applyRules.normalApplyLc)}
        </p>
        <p className="mt-1">
          {BACKOFFICE_PT.vipApply}: <code className="text-xs text-slate-400">{data.applyRules.vipApplyFormula}</code>
        </p>
      </section>
    </BackofficePageShell>
  );
}
