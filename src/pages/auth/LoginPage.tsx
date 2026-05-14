import type { FormEvent } from 'react';
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { ROUTES } from '@/utils/constants';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const { signInWithEmail, signInWithGoogle, isConfigured } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as { from?: string } | null)?.from;

  const goAfterLogin = () => {
    if (from && from !== ROUTES.login) {
      navigate(from, { replace: true });
      return;
    }
    navigate(ROUTES.clientDashboard, { replace: true });
  };

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
    setSubmitting(true);
    try {
      const err = await signInWithGoogle();
      if (err?.code === 'unavailable') showToast(t('auth.errors.env_not_ready'), 'info');
      else if (err) {
        showToast(t(err.messageKey, err.vars), 'error');
        if (import.meta.env.DEV && err.devRaw) console.info('[LinkHelp] Google OAuth raw:', err.devRaw);
      }
    } finally {
      setSubmitting(false);
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
                    disabled={submitting}
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
                    disabled={submitting}
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
                disabled={submitting}
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

              <button
                type="button"
                disabled={submitting}
                className="mt-6 flex w-full justify-center items-center gap-3 rounded-2xl border border-slate-200 bg-white py-3.5 px-4 text-sm font-bold text-slate-800 shadow-sm hover:bg-slate-50 hover:border-slate-300 hover:shadow-md transition-all min-h-[52px] disabled:opacity-60"
                onClick={() => void handleGoogle()}
              >
                <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                {t('login_page.google')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
