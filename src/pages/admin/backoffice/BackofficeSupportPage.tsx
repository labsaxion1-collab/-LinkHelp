import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { backofficeFetch, BackofficeApiError } from '@/backoffice/api/backofficeClient';
import { BackofficePageShell } from '@/backoffice/components/BackofficePageShell';
import { BACKOFFICE_PT, formatBackofficeApiError } from '@/admin/fluxPtCopy';

export default function BackofficeSupportPage() {
  const { session } = useAuth();
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
      .catch((e: unknown) =>
        setError(formatBackofficeApiError(e instanceof BackofficeApiError ? e.code : 'BACKOFFICE_UNAVAILABLE')),
      );
  }, [session?.access_token, userId]);

  return (
    <BackofficePageShell title={BACKOFFICE_PT.supportTitle} subtitle={BACKOFFICE_PT.supportSubtitle}>
      <div className="border border-violet-500/30 bg-violet-500/10 p-4 text-sm text-violet-100">
        {BACKOFFICE_PT.supportReadonlyBanner}
      </div>
      {!userId ? <p className="text-sm text-slate-400">{BACKOFFICE_PT.supportPickUser}</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {payload ? (
        <pre className="max-h-[480px] overflow-auto border border-white/10 bg-black/50 p-4 text-xs text-slate-300">
          {JSON.stringify(payload, null, 2)}
        </pre>
      ) : null}
    </BackofficePageShell>
  );
}
