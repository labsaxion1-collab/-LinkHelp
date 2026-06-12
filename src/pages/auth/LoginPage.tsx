import type { FormEvent } from 'react';

import { useEffect, useState } from 'react';

import { Link, useNavigate, useLocation } from 'react-router-dom';

import { Mail, Lock, ArrowLeft, ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react';

import { ByFluxBadge } from '@/components/brand/ByFluxBadge';

import { ROUTES } from '@/utils/constants';

import { useLanguage } from '@/context/LanguageContext';

import { useAuth } from '@/context/AuthContext';

import { useToast } from '@/context/ToastContext';

import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';

import { oauthErrorMessageKey, type OAuthCallbackErrorCode } from '@/utils/parseOAuthCallbackError';

import { readKeepSignedIn, writeKeepSignedIn } from '@/utils/rememberSession';

import {

  clearOAuthCallbackActive,

  clearOAuthRedirectPending,

  isOAuthCallbackActive,

  isOAuthRedirectPending,

} from '@/utils/authStorage';

import { getSupabase } from '@/lib/supabase';

import { resolvePostLoginPath, resolveEffectiveRole } from '@/utils/userRole';

import { writeStoredAppMode } from '@/utils/appModeStorage';

import { authFlowLog, roleFromAuthMetadata, roleRoutingLog } from '@/lib/authDebug';



const INPUT_CLASS =

  'block w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-[#0F172A] placeholder:text-slate-400 transition-all focus:border-[#2563FF] focus:outline-none focus:ring-[6px] focus:ring-[rgba(37,99,255,0.12)] disabled:opacity-60';



export default function LoginPage() {

  const navigate = useNavigate();

  const location = useLocation();

  const { t } = useLanguage();

  const { showToast } = useToast();

  const { signInWithEmail, signInWithGoogle, isConfigured, session, profile, authBootstrapped, authLoading, refreshProfile } =

    useAuth();

  const [email, setEmail] = useState('');

  const [password, setPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const [googleLoading, setGoogleLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [keepSignedIn, setKeepSignedIn] = useState(() => readKeepSignedIn());

  const [resetOpen, setResetOpen] = useState(false);

  const [resetEmail, setResetEmail] = useState('');

  const [resetSubmitting, setResetSubmitting] = useState(false);



  const from = (location.state as { from?: string } | null)?.from;



  useEffect(() => {

    if (!isOAuthRedirectPending()) {

      clearOAuthCallbackActive();

      clearOAuthRedirectPending();

    }

  }, []);



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



  const goAfterLogin = (userId?: string, profileOverride?: typeof profile) => {

    const p = profileOverride ?? profile;

    const role = resolveEffectiveRole(p, session?.user);

    writeStoredAppMode(role, userId ?? session?.user?.id);

    const dest = resolvePostLoginPath(role, from);

    roleRoutingLog('LoginPage:redirect', {

      userId: userId ?? session?.user?.id ?? null,

      email: session?.user?.email ?? p?.email ?? null,

      role_from_profile: p?.role ?? null,

      role_from_auth: roleFromAuthMetadata(session?.user),

      redirect_destination: dest,

      from_path: from ?? null,

    });

    authFlowLog('Login redirect', {

      userId: userId ?? session?.user?.id,

      role,

      dest,

      from,

    });

    navigate(dest, { replace: true });

  };



  useEffect(() => {

    if (!isConfigured || !authBootstrapped || authLoading) return;

    if (isOAuthCallbackActive() || isOAuthRedirectPending()) return;

    if (!session?.user) return;

    if (!profile) {

      void refreshProfile(session.user);

      return;

    }

    goAfterLogin(session.user.id);

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

    goAfterLogin(recovered?.id ?? session?.user?.id, recovered);

  };



  const handleGoogle = async () => {

    console.log('[Google OAuth] Button clicked');

    setError(null);

    if (!isConfigured) {

      showToast(t('auth.errors.env_not_ready'), 'info');

      return;

    }

    writeKeepSignedIn(keepSignedIn);

    setGoogleLoading(true);

    const loadingGuard = window.setTimeout(() => {

      if (!isOAuthRedirectPending()) setGoogleLoading(false);

    }, 15_000);

    try {

      const err = await signInWithGoogle();

      if (isOAuthRedirectPending()) return;

      if (err?.code === 'unavailable') showToast(t('auth.errors.env_not_ready'), 'info');

      else if (err) {

        clearOAuthRedirectPending();

        const msg = t(err.messageKey, err.vars);

        setError(msg);

        showToast(err.devRaw ? `${msg} (${err.devRaw})` : msg, 'error');

        if (err.devRaw) console.info('[LinkHelp] Google OAuth raw:', err.devRaw);

        setGoogleLoading(false);

        return;

      }

    } finally {

      window.clearTimeout(loadingGuard);

      if (!isOAuthRedirectPending()) setGoogleLoading(false);

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

    <div className="flex min-h-[100dvh] flex-col bg-[#F5F7FB]">

      <div className="mx-auto w-full max-w-lg px-4 pb-2 pt-6 sm:px-8">

        <Link

          to={ROUTES.home}

          className="inline-flex items-center gap-2 rounded-full border border-[rgba(37,99,255,0.15)] bg-white px-4 py-2 text-sm font-semibold text-[#64748B] shadow-[0_4px_16px_rgba(15,23,42,0.04)] transition-colors hover:border-[rgba(37,99,255,0.28)] hover:text-[#2563FF]"

        >

          <ArrowLeft className="h-4 w-4" />

          {t('login_page.back_home')}

        </Link>

      </div>



      <div className="flex flex-1 flex-col justify-center px-4 pb-10 sm:px-6">

        <div className="mx-auto w-full max-w-[440px]">

          <div className="overflow-visible rounded-[28px] border border-[rgba(37,99,255,0.08)] bg-white p-6 shadow-[0_10px_40px_rgba(15,23,42,0.06)] sm:p-10">

            <div className="mb-8 text-center">

              <img

                src="/brand/logo icon.png"

                alt="LinkHelp"

                className="mx-auto mb-3 h-20 w-20 object-contain sm:h-24 sm:w-24"

              />

              <div className="mb-5 flex justify-center">

                <ByFluxBadge alwaysVisible className="text-[#94A3B8]" />

              </div>

              <h1 className="text-[1.75rem] font-black leading-tight tracking-tight text-[#0F172A] sm:text-3xl">

                {t('login_page.title_prefix')}{' '}

                <span className="text-[#2563FF]">{t('login_page.title_highlight')}</span>

              </h1>

              <p className="mt-2 text-sm font-medium text-[#64748B]">{t('login_page.welcome_subtitle')}</p>

            </div>



            {error ? (

              <div className="mb-5 animate-in fade-in zoom-in-95 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 duration-200">

                {error}

              </div>

            ) : null}



            <form className="space-y-5" onSubmit={handleSubmit}>

              <div>

                <label htmlFor="email" className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">

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

                    className={`${INPUT_CLASS} pl-11`}

                    placeholder="you@example.com"

                  />

                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#2563FF]/70" />

                </div>

              </div>



              <div>

                <label htmlFor="password" className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">

                  {t('login_page.password_label')}

                </label>

                <div className="relative">

                  <input

                    id="password"

                    name="password"

                    type={showPassword ? 'text' : 'password'}

                    autoComplete="current-password"

                    required

                    value={password}

                    onChange={(e) => setPassword(e.target.value)}

                    disabled={submitting || googleLoading}

                    className={`${INPUT_CLASS} pl-11 pr-11`}

                    placeholder="••••••••"

                  />

                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#2563FF]/70" />

                  <button

                    type="button"

                    onClick={() => setShowPassword((current) => !current)}

                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition-colors hover:text-[#2563FF]"

                    aria-label={showPassword ? 'Hide password' : 'Show password'}

                  >

                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}

                  </button>

                </div>

              </div>



              <div className="flex items-center justify-between gap-3 text-sm">

                <label className="flex cursor-pointer items-center gap-2.5 font-medium text-[#0F172A]">

                  <input

                    id="remember-me"

                    name="remember-me"

                    type="checkbox"

                    checked={keepSignedIn}

                    onChange={(e) => setKeepSignedIn(e.target.checked)}

                    className="h-4 w-4 rounded border-slate-300 text-[#2563FF] focus:ring-[#2563FF]/30"

                  />

                  {t('login_page.remember')}

                </label>

                <button

                  type="button"

                  onClick={() => {

                    setResetEmail(email);

                    setResetOpen(true);

                  }}

                  className="shrink-0 font-semibold text-[#2563FF] hover:text-[#1d4ed8]"

                >

                  {t('login_page.forgot')}

                </button>

              </div>



              <button

                type="submit"

                disabled={submitting || googleLoading}

                className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2563FF] to-[#3B82F6] px-4 py-3.5 text-sm font-bold text-white shadow-[0_10px_25px_rgba(37,99,255,0.35)] transition-all hover:brightness-105 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[#2563FF]/40 focus:ring-offset-2 disabled:opacity-60"

              >

                <span className="flex-1 text-center">{submitting ? t('common.loading') : t('login_page.submit')}</span>

                {!submitting ? <ArrowRight className="h-5 w-5 shrink-0" aria-hidden /> : null}

              </button>

            </form>



            <div className="mt-8">

              <div className="relative">

                <div className="absolute inset-0 flex items-center">

                  <div className="w-full border-t border-slate-200" />

                </div>

                <div className="relative flex justify-center">

                  <span className="bg-white px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#94A3B8]">

                    {t('login_page.divider')}

                  </span>

                </div>

              </div>



              <GoogleSignInButton

                className="mt-5 rounded-xl border-slate-200 shadow-[0_4px_14px_rgba(15,23,42,0.04)] hover:border-slate-300"

                loading={googleLoading}

                disabled={submitting}

                onClick={() => void handleGoogle()}

              />

            </div>



            <div className="relative mt-8 flex items-center gap-4 overflow-visible border-t border-slate-100 pt-6">

              <div className="relative z-10 flex min-w-0 flex-1 items-start gap-3">

                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EFF6FF] text-[#2563FF]">

                  <ShieldCheck className="h-5 w-5" />

                </span>

                <div className="min-w-0">

                  <p className="text-sm font-bold text-[#0F172A]">{t('login_page.security_title')}</p>

                  <p className="mt-0.5 text-xs font-medium leading-relaxed text-[#64748B]">

                    {t('login_page.security_subtitle')}

                  </p>

                </div>

              </div>

              <div className="relative z-0 h-20 w-20 shrink-0 overflow-visible">

                <img

                  src="/brand/cadeado.png"

                  alt=""

                  aria-hidden

                  style={{ width: 300, height: 300, maxWidth: 'none' }}

                  className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 object-contain"

                />

              </div>

            </div>

          </div>



          <p className="mt-6 text-center text-sm font-medium text-[#64748B]">

            {t('login_page.subtitle_no_account')}{' '}

            <Link to={ROUTES.signup} className="font-bold text-[#2563FF] hover:text-[#1d4ed8]">

              {t('login_page.signup_link')}

            </Link>

          </p>

        </div>

      </div>



      {resetOpen ? (

        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#0F172A]/40 px-4 py-4 backdrop-blur-[2px] sm:items-center">

          <div className="w-full max-w-md rounded-[28px] border border-[rgba(37,99,255,0.08)] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.12)]">

            <h2 className="text-xl font-black text-[#0F172A]">{t('auth.reset_request_title')}</h2>

            <p className="mt-2 text-sm font-medium leading-relaxed text-[#64748B]">{t('auth.reset_request_subtitle')}</p>



            <form className="mt-5 space-y-4" onSubmit={handlePasswordReset}>

              <div>

                <label htmlFor="reset-email" className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">

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

                    className={`${INPUT_CLASS} pl-11`}

                    placeholder="you@example.com"

                  />

                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#2563FF]/70" />

                </div>

              </div>



              <div className="flex flex-col-reverse gap-3 sm:flex-row">

                <button

                  type="button"

                  onClick={() => setResetOpen(false)}

                  className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold text-[#0F172A] hover:bg-slate-50"

                >

                  {t('common.cancel')}

                </button>

                <button

                  type="submit"

                  disabled={resetSubmitting}

                  className="flex-1 rounded-xl bg-gradient-to-r from-[#2563FF] to-[#3B82F6] py-3 text-sm font-bold text-white shadow-[0_10px_25px_rgba(37,99,255,0.3)] hover:brightness-105 disabled:opacity-60"

                >

                  {resetSubmitting ? t('common.loading') : t('auth.reset_request_submit')}

                </button>

              </div>

            </form>

          </div>

        </div>

      ) : null}

    </div>

  );

}


