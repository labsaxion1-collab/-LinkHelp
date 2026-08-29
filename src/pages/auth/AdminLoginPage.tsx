import type { FormEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, ShieldAlert } from 'lucide-react';
import { FluxBrandMark } from '@/components/brand/FluxBrandMark';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { FLUX_AUTH_PT, adminPtMessage } from '@/admin/fluxPtCopy';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { authFlowLog } from '@/lib/authDebug';
import { getSupabase } from '@/lib/supabase';
import { acceptAdminInvite } from '@/admin/administrators/acceptAdminInvite';
import { isFluxAdmin } from '@/utils/adminAccess';
import { ROUTES } from '@/utils/constants';
import { LINKHELP_PUBLIC_ORIGIN } from '@/utils/fluxHost';
import {
  clearPersistedAdminReturnTo,
  getAdminPostLoginDestination,
  markAdminOAuthFlow,
  persistAdminReturnTo,
  readPersistedAdminReturnTo,
  readReturnToFromLocation,
} from '@/utils/fluxRedirect';
import { isOAuthCallbackActive, isOAuthRedirectPending } from '@/utils/authStorage';

const INPUT_CLASS =
  'block w-full rounded-xl border border-cyan-500/20 bg-[#0a0f1a] px-4 py-3.5 text-sm text-white placeholder:text-slate-500 transition-all focus:border-cyan-400/50 focus:outline-none focus:ring-[6px] focus:ring-cyan-500/10 disabled:opacity-60';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const {
    signInWithEmail,
    signInWithGoogle,
    isConfigured,
    session,
    authBootstrapped,
    authLoading,
    refreshProfile,
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const returnToFromLocation = useMemo(
    () => readReturnToFromLocation(location.search, (location.state as { from?: string } | null)?.from),
    [location.search, location.state],
  );

  const returnToRef = useRef(returnToFromLocation);
  if (returnToFromLocation) {
    returnToRef.current = returnToFromLocation;
  }

  useEffect(() => {
    persistAdminReturnTo(returnToFromLocation ?? returnToRef.current);
  }, [returnToFromLocation]);

  const effectiveReturnTo = returnToFromLocation ?? readPersistedAdminReturnTo() ?? returnToRef.current;

  const redirectedRef = useRef(false);

  const finishAdminLogin = async (activeSession: Session) => {
    if (redirectedRef.current) return;

    // Accept pending invite (email match) before the admin gate — refreshes JWT claim.
    if (activeSession.access_token) {
      await acceptAdminInvite(activeSession.access_token);
      const sb = getSupabase();
      const { data } = sb ? await sb.auth.getSession() : { data: { session: null } };
      if (data.session) activeSession = data.session;
    }

    if (!isFluxAdmin(activeSession)) {
      authFlowLog('AdminLogin: access denied — not admin', { userId: activeSession.user.id });
      navigate(ROUTES.fluxAccessDenied, { replace: true });
      return;
    }

    const dest = getAdminPostLoginDestination(activeSession, effectiveReturnTo);
    authFlowLog('AdminLogin: redirect', { dest, returnTo: effectiveReturnTo });
    redirectedRef.current = true;
    clearPersistedAdminReturnTo();
    navigate(dest, { replace: true });
  };

  useEffect(() => {
    if (!isConfigured || !authBootstrapped || authLoading) return;
    if (isOAuthCallbackActive() || isOAuthRedirectPending()) return;
    if (submitting || googleLoading) return;

    void (async () => {
      const sb = getSupabase();
      if (!sb) return;
      const { data } = await sb.auth.getSession();
      const activeSession = data.session;
      if (!activeSession?.user) return;
      // Admins may have no marketplace profile — do not block FLUX login on profile.
      await finishAdminLogin(activeSession);
    })();
  }, [isConfigured, authBootstrapped, authLoading, session, effectiveReturnTo, submitting, googleLoading]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isConfigured) {
      showToast(adminPtMessage('auth.errors.env_not_ready'), 'info');
      return;
    }
    setSubmitting(true);
    const err = await signInWithEmail(email, password);
    if (err) {
      setSubmitting(false);
      setError(adminPtMessage(err.messageKey, err.vars));
      return;
    }

    const sb = getSupabase();
    const { data: sessionData } = sb ? await sb.auth.getSession() : { data: { session: null } };
    await refreshProfile(sessionData.session?.user ?? undefined);
    setSubmitting(false);

    if (sessionData.session?.user) {
      await finishAdminLogin(sessionData.session);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    if (!isConfigured) {
      showToast(adminPtMessage('auth.errors.env_not_ready'), 'info');
      return;
    }
    setGoogleLoading(true);
    try {
      persistAdminReturnTo(effectiveReturnTo ?? null);
      markAdminOAuthFlow();
      const err = await signInWithGoogle({ next: effectiveReturnTo });
      if (!isOAuthRedirectPending() && err) {
        setError(adminPtMessage(err.messageKey, err.vars));
      }
    } finally {
      if (!isOAuthRedirectPending()) setGoogleLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-[#030508] text-slate-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-0 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-violet-600/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <div className="mb-8 flex flex-col items-center text-center">
          <FluxBrandMark showTagline forcePtTagline className="mb-4" />
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300/80">{FLUX_AUTH_PT.kicker}</p>
          <h1 className="mt-2 text-2xl font-black text-white">{FLUX_AUTH_PT.title}</h1>
          <p className="mt-2 text-sm text-slate-400">{FLUX_AUTH_PT.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-cyan-500/15 bg-[#050912]/90 p-6 shadow-2xl backdrop-blur-xl">
          {error ? (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-200">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-400">{FLUX_AUTH_PT.emailLabel}</span>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`${INPUT_CLASS} pl-10`}
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-400">{FLUX_AUTH_PT.passwordLabel}</span>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${INPUT_CLASS} pl-10 pr-10`}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? FLUX_AUTH_PT.hidePassword : FLUX_AUTH_PT.showPassword}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-cyan-500/20 transition hover:brightness-110 disabled:opacity-60"
          >
            {submitting ? FLUX_AUTH_PT.signingIn : FLUX_AUTH_PT.submit}
          </button>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wider text-slate-500">
              <span className="bg-[#050912] px-2">{FLUX_AUTH_PT.divider}</span>
            </div>
          </div>

          <GoogleSignInButton
            disabled={submitting}
            loading={googleLoading}
            onClick={handleGoogle}
            label={FLUX_AUTH_PT.google}
            loadingLabel={FLUX_AUTH_PT.googleConnecting}
          />
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          <a href={LINKHELP_PUBLIC_ORIGIN} className="font-semibold text-cyan-400/90 hover:text-cyan-300">
            {FLUX_AUTH_PT.backToLinkhelp}
          </a>
        </p>
      </div>
    </div>
  );
}
