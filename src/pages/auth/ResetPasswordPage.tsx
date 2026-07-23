import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { ROUTES } from '@/utils/constants';
import {
  classifyRecoveryError,
  exchangeRecoveryCodeForSession,
  recoveryErrorTranslationKey,
} from '@/utils/passwordRecovery';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [checkingLink, setCheckingLink] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [showResend, setShowResend] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const prepareRecoverySession = async () => {
      if (!isSupabaseConfigured()) {
        setError(t('auth.errors.env_not_ready'));
        setCheckingLink(false);
        return;
      }

      const sb = getSupabase();
      if (!sb) {
        setError(t('auth.reset_invalid_link'));
        setCheckingLink(false);
        return;
      }

      try {
        await sb.auth.initialize();
        const url = new URL(window.location.href);

        const tokenHash = url.searchParams.get('token_hash')?.trim();
        const type = url.searchParams.get('type')?.trim();
        if (tokenHash && type === 'recovery') {
          navigate(`${ROUTES.authConfirm}?${url.searchParams.toString()}`, { replace: true });
          return;
        }

        const code = url.searchParams.get('code');
        if (code) {
          const { error: exchangeError } = await exchangeRecoveryCodeForSession(
            (c) => sb.auth.exchangeCodeForSession(c),
            code,
          );
          if (exchangeError) {
            const kind = classifyRecoveryError(exchangeError);
            throw Object.assign(new Error(exchangeError.message), { kind });
          }
          window.history.replaceState({}, document.title, ROUTES.resetPassword);
        }

        const { data } = await sb.auth.getSession();
        if (!cancelled) {
          const hasUser = Boolean(data.session?.user);
          setReady(hasUser);
          if (!hasUser) {
            setError(t('auth.reset_invalid_link'));
            setShowResend(true);
          }
        }
      } catch (err) {
        if (!cancelled) {
          const kind =
            err && typeof err === 'object' && 'kind' in err
              ? (err as { kind: ReturnType<typeof classifyRecoveryError> }).kind
              : classifyRecoveryError(err);
          setError(t(recoveryErrorTranslationKey(kind)));
          setReady(false);
          setShowResend(true);
        }
      } finally {
        if (!cancelled) setCheckingLink(false);
      }
    };

    void prepareRecoverySession();

    return () => {
      cancelled = true;
    };
  }, [navigate, t]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(t('register_page.password_mismatch'));
      return;
    }

    if (password.length < 6) {
      setError(t('auth.errors.weak_password'));
      return;
    }

    const sb = getSupabase();
    if (!sb) {
      setError(t('auth.reset_invalid_link'));
      return;
    }

    setSubmitting(true);
    const { error: updateError } = await sb.auth.updateUser({ password });
    setSubmitting(false);

    if (updateError) {
      setError(t(recoveryErrorTranslationKey(classifyRecoveryError(updateError))));
      return;
    }

    await sb.auth.signOut();
    showToast(t('auth.reset_success'), 'success');
    navigate(ROUTES.login, { replace: true });
  };

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
        <div className="max-w-md mx-auto w-full">
          <div className="text-center mb-8">
            <Logo className="mx-auto mb-5" iconClassName="w-11 h-11" textClassName="text-2xl sm:text-3xl font-bold tracking-tight" />
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{t('auth.reset_title')}</h1>
            <p className="mt-3 text-sm text-slate-500">{t('auth.reset_subtitle')}</p>
          </div>

          <div className="rounded-3xl bg-white/95 backdrop-blur shadow-2xl shadow-slate-200/50 border border-slate-100/90 p-6 sm:p-8 ring-1 ring-slate-100/80">
            {checkingLink ? (
              <div className="py-8 text-center text-sm font-semibold text-slate-500">{t('common.loading')}</div>
            ) : (
              <>
                {error && (
                  <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 font-medium">
                    {error}
                  </div>
                )}

                {ready ? (
                  <form className="space-y-5" onSubmit={handleSubmit}>
                    <div>
                      <label htmlFor="new-password" className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">
                        {t('auth.reset_new_password')}
                      </label>
                      <div className="relative">
                        <input
                          id="new-password"
                          type="password"
                          autoComplete="new-password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="block w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3.5 pl-11 text-sm text-slate-900 placeholder:text-slate-400 shadow-inner focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
                          placeholder="••••••••"
                        />
                        <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="confirm-new-password" className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">
                        {t('auth.reset_confirm_password')}
                      </label>
                      <div className="relative">
                        <input
                          id="confirm-new-password"
                          type="password"
                          autoComplete="new-password"
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="block w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3.5 pl-11 text-sm text-slate-900 placeholder:text-slate-400 shadow-inner focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
                          placeholder="••••••••"
                        />
                        <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex w-full justify-center rounded-2xl bg-blue-600 py-3.5 px-4 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 transition-all min-h-[52px] disabled:opacity-60"
                    >
                      {submitting ? t('common.loading') : t('auth.reset_submit')}
                    </button>
                  </form>
                ) : (
                  <div className="space-y-3">
                    {showResend ? (
                      <Link
                        to={`${ROUTES.login}?recovery=1`}
                        className="flex w-full justify-center rounded-2xl bg-blue-600 py-3.5 px-4 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
                      >
                        {t('auth.reset_resend_link')}
                      </Link>
                    ) : null}
                    <Link
                      to={ROUTES.login}
                      className="flex w-full justify-center rounded-2xl bg-slate-900 py-3.5 px-4 text-sm font-bold text-white shadow-lg shadow-slate-900/15 hover:bg-black transition-all"
                    >
                      {t('auth.reset_back_login')}
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
