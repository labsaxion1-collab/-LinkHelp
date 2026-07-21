import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { backofficeFetch, BackofficeApiError } from '@/backoffice/api/backofficeClient';
import { parseBackofficeCreditList } from '@/backoffice/contracts/creditsContract';
import { BackofficePageShell, BackofficeTableShell } from '@/backoffice/components/BackofficePageShell';
import { useLanguage } from '@/context/LanguageContext';

export default function BackofficeCreditsPage() {
  const { session } = useAuth();
  const { t } = useLanguage();
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
      .catch((e: unknown) => setError(e instanceof BackofficeApiError ? e.code : 'BACKOFFICE_UNAVAILABLE'));
  }, [session?.access_token, typeFilter]);

  return (
    <BackofficePageShell title={t('backoffice.credits_title')} subtitle={t('backoffice.credits_subtitle')}>
      <select
        value={typeFilter}
        onChange={(e) => setTypeFilter(e.target.value)}
        className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
      >
        <option value="">{t('backoffice.filter_all_types')}</option>
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
              <th className="px-4 py-3">{t('backoffice.col_type')}</th>
              <th className="px-4 py-3">{t('backoffice.col_helper')}</th>
              <th className="px-4 py-3">{t('backoffice.col_amount')}</th>
              <th className="px-4 py-3">{t('backoffice.col_date')}</th>
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
