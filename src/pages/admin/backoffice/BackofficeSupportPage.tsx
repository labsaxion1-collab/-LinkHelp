import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { backofficeFetch, BackofficeApiError } from '@/backoffice/api/backofficeClient';
import { BackofficePageShell } from '@/backoffice/components/BackofficePageShell';
import { useLanguage } from '@/context/LanguageContext';

export default function BackofficeSupportPage() {
  const { session } = useAuth();
  const { t } = useLanguage();
  const [params] = useSearchParams();
  const userId = params.get('userId') ?? '';
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = session?.access_token;
    if (!token || !userId) return;
    void backofficeFetch<Record<string, unknown>>(
      token,
      `/api/backoffice/support?userId=${encodeURIComponent(userId)}`,
    )
      .then(setPayload)
      .catch((e: unknown) => setError(e instanceof BackofficeApiError ? e.code : 'BACKOFFICE_UNAVAILABLE'));
  }, [session?.access_token, userId]);

  return (
    <BackofficePageShell title={t('backoffice.support_title')} subtitle={t('backoffice.support_subtitle')}>
      <div className="border border-violet-500/30 bg-violet-500/10 p-4 text-sm text-violet-100">
        {t('backoffice.support_readonly_banner')}
      </div>
      {!userId ? <p className="text-sm text-slate-400">{t('backoffice.support_pick_user')}</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {payload ? (
        <pre className="max-h-[480px] overflow-auto border border-white/10 bg-black/50 p-4 text-xs text-slate-300">
          {JSON.stringify(payload, null, 2)}
        </pre>
      ) : null}
    </BackofficePageShell>
  );
}
