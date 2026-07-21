import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { backofficeFetch, BackofficeApiError } from '@/backoffice/api/backofficeClient';
import { parseBackofficeUserDetail } from '@/backoffice/contracts/usersContract';
import { BackofficePageShell } from '@/backoffice/components/BackofficePageShell';
import { BACKOFFICE_PT, formatBackofficeApiError } from '@/admin/fluxPtCopy';
import { ROUTES } from '@/utils/constants';

export default function BackofficeUserDetailPage() {
  const { userId = '' } = useParams();
  const { session } = useAuth();
  const [detail, setDetail] = useState<ReturnType<typeof parseBackofficeUserDetail>>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = session?.access_token;
    if (!token || !userId) return;
    void backofficeFetch<unknown>(token, `/api/backoffice/users?userId=${encodeURIComponent(userId)}`)
      .then((raw) => setDetail(parseBackofficeUserDetail(raw)))
      .catch((e: unknown) => {
        setError(
          formatBackofficeApiError(e instanceof BackofficeApiError ? e.code : 'BACKOFFICE_UNAVAILABLE'),
        );
      });
  }, [session?.access_token, userId]);

  const profile = detail?.profile;
  const role = String(profile?.role ?? '');

  return (
    <BackofficePageShell
      title={String(profile?.name ?? BACKOFFICE_PT.userDetail)}
      subtitle={String(profile?.email ?? userId)}
    >
      <Link to={ROUTES.adminUsers} className="text-xs font-bold text-cyan-400 hover:underline">
        ← {BACKOFFICE_PT.backToUsers}
      </Link>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <section className="border border-white/10 bg-white/[0.02] p-4">
          <h3 className="text-sm font-black text-white">{BACKOFFICE_PT.profileSection}</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div><dt className="text-slate-500">{BACKOFFICE_PT.colRole}</dt><dd className="text-slate-200 capitalize">{role}</dd></div>
            <div><dt className="text-slate-500">{BACKOFFICE_PT.colCity}</dt><dd className="text-slate-200">{String(profile?.city ?? '—')}</dd></div>
            <div><dt className="text-slate-500">{BACKOFFICE_PT.colPhone}</dt><dd className="text-slate-200">{String(profile?.phone ?? '—')}</dd></div>
          </dl>
        </section>

        {role === 'helper' && detail?.wallet ? (
          <section className="border border-white/10 bg-white/[0.02] p-4">
            <h3 className="text-sm font-black text-white">{BACKOFFICE_PT.walletSection}</h3>
            <p className="mt-2 text-2xl font-black tabular-nums text-cyan-300">
              {String((detail.wallet as { balance?: number }).balance ?? 0)} LC
            </p>
          </section>
        ) : null}
      </div>

      {role === 'helper' ? (
        <section className="border border-white/10 bg-white/[0.02] p-4">
          <h3 className="text-sm font-black text-white">{BACKOFFICE_PT.recentTransactions}</h3>
          <ul className="mt-2 space-y-1 text-xs text-slate-400">
            {(detail?.recentTransactions ?? []).slice(0, 10).map((tx, i) => {
              const row = tx as { type?: string; amount?: number; created_at?: string };
              return (
                <li key={i}>
                  {row.type} · {row.amount} LC · {row.created_at}
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <section className="border border-white/10 bg-white/[0.02] p-4">
          <h3 className="text-sm font-black text-white">{BACKOFFICE_PT.recentRequests}</h3>
          <ul className="mt-2 space-y-1 text-xs text-slate-400">
            {(detail?.recentRequests ?? []).slice(0, 10).map((r, i) => {
              const row = r as { id?: string; title?: string; status?: string };
              return (
                <li key={i}>
                  {row.title} · {row.status}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <Link
        to={`${ROUTES.adminSupport}?userId=${encodeURIComponent(userId)}`}
        className="inline-flex text-xs font-bold text-violet-300 hover:underline"
      >
        {BACKOFFICE_PT.openSupportView}
      </Link>
    </BackofficePageShell>
  );
}
