import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { backofficeFetch, BackofficeApiError } from '@/backoffice/api/backofficeClient';
import { parseBackofficeUserDetail } from '@/backoffice/contracts/usersContract';
import { BackofficePageShell } from '@/backoffice/components/BackofficePageShell';
import { useLanguage } from '@/context/LanguageContext';
import { ROUTES } from '@/utils/constants';

export default function BackofficeUserDetailPage() {
  const { userId = '' } = useParams();
  const { session } = useAuth();
  const { t } = useLanguage();
  const [detail, setDetail] = useState<ReturnType<typeof parseBackofficeUserDetail>>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = session?.access_token;
    if (!token || !userId) return;
    void backofficeFetch<unknown>(token, `/api/backoffice/users?userId=${encodeURIComponent(userId)}`)
      .then((raw) => setDetail(parseBackofficeUserDetail(raw)))
      .catch((e: unknown) => {
        setError(e instanceof BackofficeApiError ? e.code : 'BACKOFFICE_UNAVAILABLE');
      });
  }, [session?.access_token, userId]);

  const profile = detail?.profile;
  const role = String(profile?.role ?? '');

  return (
    <BackofficePageShell
      title={String(profile?.name ?? t('backoffice.user_detail'))}
      subtitle={String(profile?.email ?? userId)}
    >
      <Link to={ROUTES.adminUsers} className="text-xs font-bold text-cyan-400 hover:underline">
        ← {t('backoffice.back_to_users')}
      </Link>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <section className="border border-white/10 bg-white/[0.02] p-4">
          <h3 className="text-sm font-black text-white">{t('backoffice.profile_section')}</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div><dt className="text-slate-500">{t('backoffice.col_role')}</dt><dd className="text-slate-200 capitalize">{role}</dd></div>
            <div><dt className="text-slate-500">{t('backoffice.col_city')}</dt><dd className="text-slate-200">{String(profile?.city ?? '—')}</dd></div>
            <div><dt className="text-slate-500">{t('backoffice.col_phone')}</dt><dd className="text-slate-200">{String(profile?.phone ?? '—')}</dd></div>
          </dl>
        </section>

        {role === 'helper' && detail?.wallet ? (
          <section className="border border-white/10 bg-white/[0.02] p-4">
            <h3 className="text-sm font-black text-white">{t('backoffice.wallet_section')}</h3>
            <p className="mt-2 text-2xl font-black tabular-nums text-cyan-300">
              {String((detail.wallet as { balance?: number }).balance ?? 0)} LC
            </p>
          </section>
        ) : null}
      </div>

      {role === 'helper' ? (
        <section className="border border-white/10 bg-white/[0.02] p-4">
          <h3 className="text-sm font-black text-white">{t('backoffice.recent_transactions')}</h3>
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
          <h3 className="text-sm font-black text-white">{t('backoffice.recent_requests')}</h3>
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
        {t('backoffice.open_support_view')}
      </Link>
    </BackofficePageShell>
  );
}
