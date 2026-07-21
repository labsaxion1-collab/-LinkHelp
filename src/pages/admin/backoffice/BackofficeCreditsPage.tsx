import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { backofficeFetch, BackofficeApiError } from '@/backoffice/api/backofficeClient';
import { parseBackofficeCreditList } from '@/backoffice/contracts/creditsContract';
import { BackofficePageShell, BackofficeTableShell } from '@/backoffice/components/BackofficePageShell';
import { BACKOFFICE_PT, formatBackofficeApiError } from '@/admin/fluxPtCopy';

export default function BackofficeCreditsPage() {
  const { session } = useAuth();
  const [typeFilter, setTypeFilter] = useState('');
  const [data, setData] = useState<ReturnType<typeof parseBackofficeCreditList>>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = session?.access_token;
    if (!token) return;
    const params = new URLSearchParams();
    if (typeFilter) params.set('type', typeFilter);
    void backofficeFetch<unknown>(token, `/api/backoffice/credits?${params}`)
      .then((raw) => setData(parseBackofficeCreditList(raw)))
      .catch((e: unknown) =>
        setError(formatBackofficeApiError(e instanceof BackofficeApiError ? e.code : 'BACKOFFICE_UNAVAILABLE')),
      );
  }, [session?.access_token, typeFilter]);

  return (
    <BackofficePageShell title={BACKOFFICE_PT.creditsTitle} subtitle={BACKOFFICE_PT.creditsSubtitle}>
      <select
        value={typeFilter}
        onChange={(e) => setTypeFilter(e.target.value)}
        className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
      >
        <option value="">{BACKOFFICE_PT.filterAllTypes}</option>
        <option value="CREDIT_PURCHASE">CREDIT_PURCHASE</option>
        <option value="APPLICATION_INTEREST">APPLICATION_INTEREST</option>
        <option value="APPLICATION_SELECTED">APPLICATION_SELECTED</option>
        <option value="ADMIN_ADJUSTMENT">ADMIN_ADJUSTMENT</option>
        <option value="REFUND">REFUND</option>
      </select>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      <BackofficeTableShell empty={(data?.transactions.length ?? 0) === 0}>
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">{BACKOFFICE_PT.colType}</th>
              <th className="px-4 py-3">{BACKOFFICE_PT.colHelper}</th>
              <th className="px-4 py-3">{BACKOFFICE_PT.colAmount}</th>
              <th className="px-4 py-3">{BACKOFFICE_PT.colDate}</th>
            </tr>
          </thead>
          <tbody>
            {(data?.transactions ?? []).map((tx) => (
              <tr key={tx.id} className="border-b border-white/5">
                <td className="px-4 py-3 text-slate-300">{tx.type}</td>
                <td className="px-4 py-3 text-slate-400">{tx.helper_name ?? tx.helper_id.slice(0, 8)}</td>
                <td className="px-4 py-3 tabular-nums text-slate-200">{tx.amount}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{tx.created_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </BackofficeTableShell>
    </BackofficePageShell>
  );
}
