import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { backofficeFetch, BackofficeApiError } from '@/backoffice/api/backofficeClient';
import { parseBackofficeRequestList } from '@/backoffice/contracts/requestsContract';
import { BackofficePageShell, BackofficeTableShell } from '@/backoffice/components/BackofficePageShell';
import { BACKOFFICE_PT, formatBackofficeApiError } from '@/admin/fluxPtCopy';
import { ROUTES } from '@/utils/constants';

export default function BackofficeRequestsPage() {
  const { session } = useAuth();
  const [search, setSearch] = useState('');
  const [data, setData] = useState<ReturnType<typeof parseBackofficeRequestList>>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = session?.access_token;
    if (!token) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    void backofficeFetch<unknown>(token, `/api/backoffice/requests?${params}`)
      .then((raw) => setData(parseBackofficeRequestList(raw)))
      .catch((e: unknown) =>
        setError(formatBackofficeApiError(e instanceof BackofficeApiError ? e.code : 'BACKOFFICE_UNAVAILABLE')),
      )
      .finally(() => setLoading(false));
  }, [session?.access_token, search]);

  return (
    <BackofficePageShell title={BACKOFFICE_PT.requestsTitle} subtitle={BACKOFFICE_PT.requestsSubtitle}>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={BACKOFFICE_PT.searchRequestsPlaceholder}
        className="w-full max-w-md rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
      />
      {loading ? <p className="text-sm text-slate-400">{BACKOFFICE_PT.loading}</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      <BackofficeTableShell empty={!loading && (data?.requests.length ?? 0) === 0}>
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">{BACKOFFICE_PT.colTitle}</th>
              <th className="px-4 py-3">{BACKOFFICE_PT.colStatus}</th>
              <th className="px-4 py-3">{BACKOFFICE_PT.colClient}</th>
              <th className="px-4 py-3">{BACKOFFICE_PT.colApps}</th>
            </tr>
          </thead>
          <tbody>
            {(data?.requests ?? []).map((r) => (
              <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                <td className="px-4 py-3">
                  <Link to={ROUTES.adminRequestDetail.replace(':requestId', r.id)} className="text-cyan-300 hover:underline">
                    {r.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-300">{r.status}</td>
                <td className="px-4 py-3 text-slate-400">{r.client_name ?? '—'}</td>
                <td className="px-4 py-3 tabular-nums text-slate-300">{r.application_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </BackofficeTableShell>
    </BackofficePageShell>
  );
}
