import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { ByFluxBadge } from '@/components/brand/ByFluxBadge';
import { ROUTES } from '@/utils/constants';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { oauthErrorMessageKey, type OAuthCallbackErrorCode } from '@/utils/parseOAuthCallbackError';
import { readKeepSignedIn, writeKeepSignedIn } from '@/utils/rememberSession';
import { getSupabase } from '@/lib/supabase';
import { resolvePostLoginPath } from '@/utils/userRole';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const { signInWithEmail, signInWithGoogle, isConfigured, session, profile, authBootstrapped, authLoading, refreshProfile } =
    useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keepSignedIn, setKeepSignedIn] = useState(() => readKeepSignedIn());
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);

  const from = (location.state as { from?: string } | null)?.from;

  useEffect(() => {
    const st = location.state as { oauthError?: OAuthCallbackErrorCode | boolean; registered?: boolean } | null;
    if (st?.oauthError && typeof st.oauthError === 'string') {
      setError(t(oauthErrorMessageKey(st.oauthError)));
      navigate(location.pathname, { replace: true, state: from ? { from } : {} });
    } else if (st?.oauthError === true) {
      setError(t('auth.errors.oauth_google_short'));
      navigate(location.pathname, { replace: true, state: from ? { from } : {} });
    }
  }, [location.state, location.pathname, navigate, from, t]);

  const goAfterLogin = (role: 'client' | 'helper') => {
    navigate(resolvePostLoginPath(role, from), { replace: true });
  };

  useEffect(() => {
    if (!isConfigured || !authBootstrapped || authLoading) return;
    if (!session?.user) return;
    if (!profile) {
      void refreshProfile(session.user);
      return;
    }
    navigate(resolvePostLoginPath(profile.role, from), { replace: true });
  }, [isConfigured, authBootstrapped, authLoading, session, profile, from, navigate, refreshProfile]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isConfigured) {
      showToast(t('auth.errors.env_not_ready'), 'info');
      return;
    }
    writeKeepSignedIn(keepSignedIn);
    setSubmitting(true);
    const err = await signInWithEmail(email, password);
    setSubmitting(false);
    if (err) {
      setError(t(err.messageKey, err.vars));
      if (import.meta.env.DEV && err.devRaw) console.info('[LinkHelp] signIn raw:', err.devRaw);
      return;
    }
    const recovered = await refreshProfile();
    goAfterLogin(recovered?.role === 'helper' ? 'helper' : 'client');
  };

  const handleGoogle = async () => {
    setError(null);
    if (!isConfigured) {
      showToast(t('auth.errors.env_not_ready'), 'info');
      return;
    }
    writeKeepSignedIn(keepSignedIn);
    setGoogleLoading(true);
    try {
      const err = await signInWithGoogle();
      if (err?.code === 'unavailable') showToast(t('auth.errors.env_not_ready'), 'info');
      else if (err) {
        const msg = t(err.messageKey, err.vars);
        setError(msg);
        showToast(msg, 'error');
        if (import.meta.env.DEV && err.devRaw) console.info('[LinkHelp] Google OAuth raw:', err.devRaw);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handlePasswordReset = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isConfigured) {
      showToast(t('auth.errors.env_not_ready'), 'info');
      return;
    }
    const targetEmail = (resetEmail || email).trim();
    if (!targetEmail) {
      showToast(t('auth.reset_email_required'), 'error');
      return;
    }
    const sb = getSupabase();
    if (!sb) {
      showToast(t('auth.unavailable'), 'error');
      return;
    }
    setResetSubmitting(true);
    const { error: resetError } = await sb.auth.resetPasswordForEmail(targetEmail, {
      redirectTo: `${window.location.origin}${ROUTES.resetPassword}`,
    });
    setResetSubmitting(false);
    if (resetError) {
      setError(resetError.message);
      showToast(resetError.message, 'error');
      return;
    }
    setResetOpen(false);
    showToast(t('auth.reset_email_sent'), 'success');
  };

  return (
    <div className="lh-auth-bg min-h-[100dvh] flex flex-col">
      <div className="px-4 pt-6 pb-2 sm:px-8 max-w-lg mx-auto w-full">
        <Link
          to={ROUTES.home}
          className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl transition-colors hover:bg-white/[0.1] hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('login_page.back_home')}
        </Link>
      </div>

      <div className="flex-1 flex flex-col justify-center px-4 pb-10 sm:px-6">
        <div className="max-w-md mx-auto w-full">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/24 bg-white/[0.68] p-6 shadow-[0_36px_120px_rgba(0,0,0,0.52)] ring-1 ring-white/45 backdrop-blur-3xl sm:p-8">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#33B6FF]/70 to-transparent" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.42)_0%,rgba(255,255,255,0.12)_36%,rgba(51,182,255,0.08)_72%,rgba(255,255,255,0.18)_100%)]" />
            <div className="pointer-events-none absolute inset-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(255,255,255,0.16)]" />
            <div className="pointer-events-none absolute -left-24 -top-24 h-56 w-56 rounded-full bg-[#33B6FF]/22 blur-3xl" />
            <div className="pointer-events-none absolute -right-20 bottom-24 h-48 w-48 rounded-full bg-[#1677FF]/16 blur-3xl" />

            <div className="relative text-center mb-8">
              <Logo className="mx-auto mb-3 justify-center" iconClassName="w-12 h-12" textClassName="text-2xl sm:text-3xl font-bold tracking-tight" />
              <div className="mb-4 flex justify-center">
                <ByFluxBadge className="text-slate-500/80" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">{t('login_page.title')}</h1>
              <p className="mt-3 text-sm font-medium text-slate-600">
                {t('login_page.subtitle_no_account')}{' '}
                <Link to={ROUTES.signup} className="font-bold text-blue-600 hover:text-blue-700">
                  {t('login_page.signup_link')}
                </Link>
              </p>
            </div>

            <div className="relative">
            {error && (
              <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 font-medium animate-in fade-in zoom-in-95 duration-200">
                {error}
              </div>
            )}
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">
                  {t('login_page.email_label')}
                </label>
                <div className="relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={submitting || googleLoading}
                    className="block w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3.5 pl-11 text-sm text-slate-900 placeholder:text-slate-400 shadow-inner focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors disabled:opacity-60"
                    placeholder="you@example.com"
                  />
                  <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">
                  {t('login_page.password_label')}
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={submitting || googleLoading}
                    className="block w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3.5 pl-11 text-sm text-slate-900 placeholder:text-slate-400 shadow-inner focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors disabled:opacity-60"
                    placeholder="••••••••"
                  />
                  <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 text-sm">
                <label className="flex items-center gap-2 text-slate-700 font-medium cursor-pointer">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    checked={keepSignedIn}
                    onChange={(e) => setKeepSignedIn(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  {t('login_page.remember')}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email);
                    setResetOpen(true);
                  }}
                  className="font-semibold text-blue-600 hover:text-blue-700 shrink-0"
                >
                  {t('login_page.forgot')}
                </button>
              </div>

              <button
                type="submit"
                disabled={submitting || googleLoading}
                className="flex w-full justify-center rounded-2xl bg-slate-900 py-3.5 px-4 text-sm font-bold text-white shadow-lg shadow-slate-900/15 hover:bg-black hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 transition-all min-h-[52px] disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {submitting ? t('common.loading') : t('login_page.submit')}
              </button>
            </form>

            <div className="mt-8">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs font-bold uppercase tracking-wider text-slate-400">
                  <span className="bg-white/80 px-3 backdrop-blur-sm">{t('login_page.divider')}</span>
                </div>
              </div>

              <GoogleSignInButton
                className="mt-6"
                loading={googleLoading}
                disabled={submitting}
                onClick={() => void handleGoogle()}
              />
            </div>
            </div>
          </div>
        </div>
      </div>

      {resetOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/45 px-4 py-4 sm:items-center">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl shadow-slate-950/20">
            <h2 className="text-xl font-black text-slate-900">{t('auth.reset_request_title')}</h2>
            <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">{t('auth.reset_request_subtitle')}</p>

            <form className="mt-5 space-y-4" onSubmit={handlePasswordReset}>
              <div>
                <label htmlFor="reset-email" className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">
                  {t('login_page.email_label')}
                </label>
                <div className="relative">
                  <input
                    id="reset-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={resetEmail}
                    onChange={(event) => setResetEmail(event.target.value)}
                    className="block w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3.5 pl-11 text-sm text-slate-900 placeholder:text-slate-400 shadow-inner focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
                    placeholder="you@example.com"
                  />
                  <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setResetOpen(false)}
                  className="flex-1 rounded-2xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={resetSubmitting}
                  className="flex-1 rounded-2xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-60"
                >
                  {resetSubmitting ? t('common.loading') : t('auth.reset_request_submit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
