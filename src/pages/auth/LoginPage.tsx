import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { ROUTES } from '@/utils/constants';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { oauthErrorMessageKey, type OAuthCallbackErrorCode } from '@/utils/parseOAuthCallbackError';

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

  const goAfterLogin = () => {
    if (from && from !== ROUTES.login) {
      navigate(from, { replace: true });
      return;
    }
    navigate(ROUTES.clientHome, { replace: true });
  };

  useEffect(() => {
    if (!isConfigured || !authBootstrapped || authLoading) return;
    if (!session?.user) return;
    if (!profile) {
      void refreshProfile(session.user);
      return;
    }
    if (from && from !== ROUTES.login && from.startsWith('/') && !from.startsWith('//')) {
      navigate(from, { replace: true });
      return;
    }
    const dest = profile.role === 'helper' ? ROUTES.helperHome : ROUTES.clientHome;
    navigate(dest, { replace: true });
  }, [isConfigured, authBootstrapped, authLoading, session, profile, from, navigate, refreshProfile]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isConfigured) {
      showToast(t('auth.errors.env_not_ready'), 'info');
      return;
    }
    setSubmitting(true);
    const err = await signInWithEmail(email, password);
    setSubmitting(false);
    if (err) {
      setError(t(err.messageKey, err.vars));
      if (import.meta.env.DEV && err.devRaw) console.info('[LinkHelp] signIn raw:', err.devRaw);
      return;
    }
    goAfterLogin();
  };

  const handleGoogle = async () => {
    setError(null);
    if (!isConfigured) {
      showToast(t('auth.errors.env_not_ready'), 'info');
      return;
    }
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

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-slate-50 to-white flex flex-col">
      <div className="px-4 pt-6 pb-2 sm:px-8 max-w-lg mx-auto w-full">
        <Link
          to={ROUTES.home}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('login_page.back_home')}
        </Link>
      </div>

      <div className="flex-1 flex flex-col justify-center px-4 pb-10 sm:px-6">
        <div className="max-w-md mx-auto w-full">
          <div className="text-center mb-8">
            <Logo className="mx-auto mb-5" iconClassName="w-11 h-11" textClassName="text-2xl sm:text-3xl font-bold tracking-tight" />
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{t('login_page.title')}</h1>
            <p className="mt-3 text-sm text-slate-500">
              {t('login_page.subtitle_no_account')}{' '}
              <Link to={ROUTES.signup} className="font-bold text-blue-600 hover:text-blue-700">
                {t('login_page.signup_link')}
              </Link>
            </p>
          </div>

          <div className="rounded-3xl bg-white/95 backdrop-blur shadow-2xl shadow-slate-200/50 border border-slate-100/90 p-6 sm:p-8 ring-1 ring-slate-100/80">
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
                  <input id="remember-me" name="remember-me" type="checkbox" className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                  {t('login_page.remember')}
                </label>
                <a href="#" className="font-semibold text-blue-600 hover:text-blue-700 shrink-0">
                  {t('login_page.forgot')}
                </a>
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
                  <span className="bg-white px-3">{t('login_page.divider')}</span>
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
  );
}
