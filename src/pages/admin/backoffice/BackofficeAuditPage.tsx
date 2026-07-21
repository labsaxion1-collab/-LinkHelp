import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { backofficeFetch, BackofficeApiError } from '@/backoffice/api/backofficeClient';
import { parseBackofficeAuditList } from '@/backoffice/contracts/auditContract';
import { BackofficePageShell, BackofficeTableShell } from '@/backoffice/components/BackofficePageShell';
import { BACKOFFICE_PT, formatBackofficeApiError } from '@/admin/fluxPtCopy';

export default function BackofficeAuditPage() {
  const { session } = useAuth();
  const [data, setData] = useState<ReturnType<typeof parseBackofficeAuditList>>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = session?.access_token;
    if (!token) return;
    void backofficeFetch<unknown>(token, '/api/backoffice/audit')
      .then((raw) => setData(parseBackofficeAuditList(raw)))
      .catch((e: unknown) =>
        setError(formatBackofficeApiError(e instanceof BackofficeApiError ? e.code : 'BACKOFFICE_UNAVAILABLE')),
      );
  }, [session?.access_token]);

  return (
    <BackofficePageShell title={BACKOFFICE_PT.auditTitle} subtitle={BACKOFFICE_PT.auditSubtitle}>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      <BackofficeTableShell empty={(data?.logs.length ?? 0) === 0}>
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">{BACKOFFICE_PT.colAction}</th>
              <th className="px-4 py-3">{BACKOFFICE_PT.colTarget}</th>
              <th className="px-4 py-3">{BACKOFFICE_PT.colDate}</th>
            </tr>
          </thead>
          <tbody>
            {(data?.logs ?? []).map((log) => (
              <tr key={log.id} className="border-b border-white/5">
                <td className="px-4 py-3 text-slate-300">{log.action}</td>
                <td className="px-4 py-3 text-slate-500">
                  {log.target_type ?? '—'} {log.target_id ?? ''}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">{log.created_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </BackofficeTableShell>
    </BackofficePageShell>
  );
}
