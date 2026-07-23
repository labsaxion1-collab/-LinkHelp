import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { useLanguage } from '@/context/LanguageContext';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { ROUTES } from '@/utils/constants';
import {
  classifyRecoveryError,
  recoveryErrorTranslationKey,
  sanitizePasswordRecoveryNext,
  verifyPasswordRecoveryTokenHash,
} from '@/utils/passwordRecovery';

/**
 * Confirms password recovery via `token_hash` (no PKCE verifier required).
 */
export default function AuthConfirmPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { t } = useLanguage();
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    let cancelled = false;

    (async () => {
      if (!isSupabaseConfigured()) {
        if (!cancelled) {
          setErrorKey('auth.errors.env_not_ready');
          setBusy(false);
        }
        return;
      }

      const sb = getSupabase();
      if (!sb) {
        if (!cancelled) {
          setErrorKey('auth.reset_invalid_link');
          setBusy(false);
        }
        return;
      }

      const tokenHash = params.get('token_hash')?.trim();
      const type = params.get('type')?.trim();
      const next = sanitizePasswordRecoveryNext(params.get('next'));

      if (!tokenHash || type !== 'recovery') {
        if (!cancelled) {
          setErrorKey('auth.reset_invalid_link');
          setBusy(false);
        }
        return;
      }

      try {
        await sb.auth.initialize();
        const { error } = await verifyPasswordRecoveryTokenHash(
          (input) => sb.auth.verifyOtp(input),
          tokenHash,
        );
        if (error) throw error;

        if (cancelled) return;

        window.history.replaceState({}, document.title, next);
        navigate(next, { replace: true });
      } catch (err) {
        if (!cancelled) {
          const kind = classifyRecoveryError(err);
          setErrorKey(recoveryErrorTranslationKey(kind));
          setBusy(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate, params, t]);

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-slate-50 to-white flex flex-col">
      <div className="px-4 pt-6 pb-2 sm:px-8 max-w-lg mx-auto w-full">
        <Link
          to={ROUTES.login}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('auth.reset_back_login')}
        </Link>
      </div>

      <div className="flex-1 flex flex-col justify-center px-4 pb-10 sm:px-6">
        <div className="max-w-md mx-auto w-full text-center">
          <Logo className="mx-auto mb-5" iconClassName="w-11 h-11" textClassName="text-2xl font-bold" />
          {busy ? (
            <p className="text-sm font-semibold text-slate-500">{t('auth.recovery_confirming')}</p>
          ) : (
            <>
              {errorKey ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 font-medium mb-4">
                  {t(errorKey)}
                </div>
              ) : null}
              <Link
                to={`${ROUTES.login}?recovery=1`}
                className="inline-flex justify-center rounded-2xl bg-blue-600 py-3 px-6 text-sm font-bold text-white"
              >
                {t('auth.reset_resend_link')}
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
