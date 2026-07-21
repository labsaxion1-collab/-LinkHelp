import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { backofficeFetch, BackofficeApiError } from '@/backoffice/api/backofficeClient';
import {
  parseBackofficeUserList,
  type BackofficeUserListResponse,
} from '@/backoffice/contracts/usersContract';
import { BackofficePageShell, BackofficeTableShell } from '@/backoffice/components/BackofficePageShell';
import { useLanguage } from '@/context/LanguageContext';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/utils/constants';

export default function BackofficeUsersPage() {
  const { session } = useAuth();
  const { t } = useLanguage();
  const [roleTab, setRoleTab] = useState<'all' | 'client' | 'helper'>('all');
  const [search, setSearch] = useState('');
  const [data, setData] = useState<BackofficeUserListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = session?.access_token;
    if (!token) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (roleTab !== 'all') params.set('role', roleTab);
    if (search.trim()) params.set('search', search.trim());
    void backofficeFetch<unknown>(token, `/api/backoffice/users?${params}`)
      .then((raw) => setData(parseBackofficeUserList(raw)))
      .catch((e: unknown) => {
        setError(e instanceof BackofficeApiError ? e.code : 'BACKOFFICE_UNAVAILABLE');
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [session?.access_token, roleTab, search]);

  return (
    <BackofficePageShell title={t('backoffice.users_title')} subtitle={t('backoffice.users_subtitle')}>
      <div className="flex flex-wrap gap-2">
        {(['all', 'client', 'helper'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setRoleTab(tab)}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
              roleTab === tab ? 'bg-cyan-500/20 text-cyan-200' : 'bg-white/5 text-slate-400'
            }`}
          >
            {t(`backoffice.users_tab_${tab}`)}
          </button>
        ))}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('backoffice.search_placeholder')}
          className="ml-auto min-w-[200px] rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-sm text-white"
        />
      </div>

      {loading ? <p className="text-sm text-slate-400">{t('backoffice.loading')}</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <BackofficeTableShell empty={!loading && (data?.users.length ?? 0) === 0}>
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">{t('backoffice.col_name')}</th>
              <th className="px-4 py-3">{t('backoffice.col_email')}</th>
              <th className="px-4 py-3">{t('backoffice.col_role')}</th>
              <th className="px-4 py-3">{t('backoffice.col_city')}</th>
              <th className="px-4 py-3">{t('backoffice.col_balance')}</th>
            </tr>
          </thead>
          <tbody>
            {(data?.users ?? []).map((u) => (
              <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                <td className="px-4 py-3">
                  <Link to={ROUTES.adminUserDetail.replace(':userId', u.id)} className="text-cyan-300 hover:underline">
                    {u.name ?? '—'}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-300">{u.email ?? '—'}</td>
                <td className="px-4 py-3 capitalize text-slate-300">{u.role}</td>
                <td className="px-4 py-3 text-slate-400">{u.city ?? '—'}</td>
                <td className="px-4 py-3 tabular-nums text-slate-300">
                  {u.role === 'helper' ? `${u.credit_balance} LC` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </BackofficeTableShell>
    </BackofficePageShell>
  );
}
