import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { backofficeFetch, BackofficeApiError } from '@/backoffice/api/backofficeClient';
import { parseBackofficeRequestDetail } from '@/backoffice/contracts/requestsContract';
import { BackofficePageShell } from '@/backoffice/components/BackofficePageShell';
import { useLanguage } from '@/context/LanguageContext';
import { ROUTES } from '@/utils/constants';

export default function BackofficeRequestDetailPage() {
  const { requestId = '' } = useParams();
  const { session } = useAuth();
  const { t } = useLanguage();
  const [detail, setDetail] = useState<ReturnType<typeof parseBackofficeRequestDetail>>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = session?.access_token;
    if (!token || !requestId) return;
    void backofficeFetch<unknown>(token, `/api/backoffice/requests?requestId=${encodeURIComponent(requestId)}`)
      .then((raw) => setDetail(parseBackofficeRequestDetail(raw)))
      .catch((e: unknown) => setError(e instanceof BackofficeApiError ? e.code : 'BACKOFFICE_UNAVAILABLE'));
  }, [session?.access_token, requestId]);

  const req = detail?.request;

  return (
    <BackofficePageShell title={String(req?.title ?? t('backoffice.request_detail'))} subtitle={requestId}>
      <Link to={ROUTES.adminRequests} className="text-xs font-bold text-cyan-400 hover:underline">
        ← {t('backoffice.back_to_requests')}
      </Link>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <section className="border border-white/10 bg-white/[0.02] p-4 text-sm text-slate-300">
          <p>{t('backoffice.col_status')}: <span className="text-white">{String(req?.status ?? '—')}</span></p>
          <p className="mt-2">{t('backoffice.col_category')}: {String(req?.category ?? '—')}</p>
          <p className="mt-2">{t('backoffice.col_budget')}: {String(req?.budget ?? '—')}</p>
          <p className="mt-2">{t('backoffice.col_location')}: {String(req?.location ?? '—')}</p>
        </section>
        <section className="border border-white/10 bg-white/[0.02] p-4 text-sm">
          <h3 className="font-black text-white">{t('backoffice.col_client')}</h3>
          <p className="mt-2 text-slate-300">{String(detail?.client?.name ?? '—')}</p>
          <p className="text-slate-500">{String(detail?.client?.email ?? '')}</p>
        </section>
      </div>
      <section className="border border-white/10 bg-white/[0.02] p-4">
        <h3 className="text-sm font-black text-white">{t('backoffice.candidates_section')}</h3>
        <ul className="mt-2 space-y-2 text-xs text-slate-400">
          {(detail?.applications ?? []).map((a, i) => {
            const row = a as { helper_name?: string; status?: string; is_exclusive?: boolean };
            return (
              <li key={i}>
                {row.helper_name ?? 'Helper'} · {row.status}
                {row.is_exclusive ? ' · VIP' : ''}
              </li>
            );
          })}
        </ul>
      </section>
    </BackofficePageShell>
  );
}
