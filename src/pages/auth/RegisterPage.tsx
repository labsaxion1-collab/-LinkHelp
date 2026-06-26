import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Mail,
  ArrowLeft,
  Globe,
  Briefcase,
  Search,
  CheckCircle2,
  User,
  LockKeyhole,
  ShieldCheck,
  Zap,
  UsersRound,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { ROUTES } from '@/utils/constants';
import { BRAND } from '@/utils/brandAssets';
import { writeStoredAppMode } from '@/utils/appModeStorage';
import { dashboardPathForRole, normalizeProfileRole, resolveEffectiveRole } from '@/utils/userRole';
import { useAuth } from '@/context/AuthContext';
import { CityRegionAutocomplete } from '@/components/common/CityRegionAutocomplete';
import type { QuebecPlace } from '@/data/quebecRegions';
import { useLanguage } from '@/context/LanguageContext';
import { APP_UI_LANGUAGES } from '@/data/spokenLanguages';
import { useToast } from '@/context/ToastContext';
import { getSupabase } from '@/lib/supabase';
import { HelperTermsGateModal } from '@/components/auth/HelperTermsGateModal';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { clearOAuthRedirectPending, isOAuthRedirectPending } from '@/utils/authStorage';
import type { AppLanguage } from '@/services/translationService';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, language, setLanguage } = useLanguage();
  const { showToast } = useToast();
  const { signUpWithEmail, signInWithGoogle, isConfigured, session, profile, authBootstrapped, authLoading, refreshProfile, signInWithEmail } =
    useAuth();
  const [userMode, setUserMode] = useState<'client' | 'helper' | null>(() => {
    const q = searchParams.get('role');
    return q === 'helper' || q === 'client' ? q : null;
  });
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [city, setCity] = useState('');
  const [cityCanon, setCityCanon] = useState('');
  const [province, setProvince] = useState('');
  const [country, setCountry] = useState('');
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  useEffect(() => {
    if (!isConfigured || !authBootstrapped || authLoading) return;
    if (!session?.user) return;
    if (!profile) {
      void refreshProfile(session.user);
      return;
    }
    const role = resolveEffectiveRole(profile, session.user);
    writeStoredAppMode(role, session.user.id);
    navigate(dashboardPathForRole(role), { replace: true });
  }, [isConfigured, authBootstrapped, authLoading, session, profile, navigate, refreshProfile]);

  const selectClientMode = () => setUserMode('client');

  const selectHelperMode = () => setUserMode('helper');

  const completeRegistration = async () => {
    if (!userMode || !isConfigured) return;
    setSubmitting(true);
    const now = new Date().toISOString();
    const ut = userMode === 'helper' ? 'helper' : 'client';
    const err = await signUpWithEmail(email, password, {
      fullName,
      userType: ut,
      city: cityCanon.trim() || city.trim(),
      region: province.trim(),
      country: country.trim(),
      acceptedTerms: true,
      acceptedTermsAt: now,
      helperTermsAccepted: ut === 'helper',
      helperTermsAcceptedAt: ut === 'helper' ? now : undefined,
      preferredLanguage: language,
    });
    setSubmitting(false);
    setTermsModalOpen(false);
    if (err) {
      if (err.messageKey === 'auth.errors.profile_create') {
        const loginErr = await signInWithEmail(email, password);
        if (!loginErr) {
          const recovered = await refreshProfile();
          const role = normalizeProfileRole(recovered?.role ?? ut);
          writeStoredAppMode(role, recovered?.id ?? session?.user?.id);
          navigate(dashboardPathForRole(role), { replace: true });
          showToast(t('register_page.welcome'), 'success');
          return;
        }
      }
      setError(t(err.messageKey, err.vars));
      setErrorKey(err.messageKey);
      if (import.meta.env.DEV && err.devRaw) console.info('[LinkHelp] signUp raw:', err.devRaw);
      return;
    }

    const sb = getSupabase();
    if (sb) {
      const {
        data: { session: newSession },
      } = await sb.auth.getSession();
      if (newSession) {
        writeStoredAppMode(ut, newSession.user.id);
        navigate(dashboardPathForRole(ut), { replace: true });
        showToast(t('register_page.welcome'), 'success');
        return;
      }
    }
    navigate(ROUTES.login, { replace: true, state: { registered: true } });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrorKey(null);
    if (!userMode) {
      setError(t('auth.register_need_mode'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('register_page.password_mismatch'));
      return;
    }
    if (!isConfigured) {
      showToast(t('auth.errors.env_not_ready'), 'info');
      return;
    }
    setTermsModalOpen(true);
  };

  const handleGoogle = async () => {
    console.log('[Google OAuth] Button clicked');
    setError(null);
    setErrorKey(null);
    if (!isConfigured) {
      showToast(t('auth.errors.env_not_ready'), 'info');
      return;
    }
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

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-[linear-gradient(180deg,#F8FBFF_0%,#EEF5FF_46%,#F7F9FD_100%)] text-[#0B1220]">
      <HelperTermsGateModal
        open={termsModalOpen}
        onReject={() => setTermsModalOpen(false)}
        onConfirm={() => void completeRegistration()}
        loading={submitting}
      />

      <main className="mx-auto flex min-h-[100dvh] w-full max-w-5xl flex-col px-5 pb-8 pt-[calc(env(safe-area-inset-top)+1.25rem)] sm:px-8 lg:px-10">
        <div className="relative">
          <div className="pointer-events-none absolute -right-20 top-4 h-64 w-64 rounded-full bg-[#2563FF]/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-24 top-64 h-52 w-52 rounded-full bg-cyan-300/20 blur-3xl" />

          <Link
            to={ROUTES.home}
            className="relative z-10 inline-flex min-h-12 items-center gap-3 rounded-full border border-white bg-white/90 px-5 text-sm font-black text-[#2563FF] shadow-[0_16px_40px_rgba(15,23,42,0.07)] ring-1 ring-slate-200/60 backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white"
          >
            <ArrowLeft className="h-5 w-5" />
            {t('login_page.back_home')}
          </Link>

          <section className="relative z-10 mt-7 min-h-[310px] overflow-hidden rounded-[2.5rem] bg-[linear-gradient(135deg,rgba(255,255,255,0.72),rgba(239,246,255,0.32))] px-1 py-4 sm:min-h-[360px] sm:px-4 md:px-8">
            <div className="pointer-events-none absolute -right-12 top-0 h-64 w-64 rounded-full bg-[#2563FF]/12 blur-3xl" />
            <div className="pointer-events-none absolute right-[5%] top-[10%] h-[72%] w-[48%] rounded-full border border-blue-200/60" />
            <div className="pointer-events-none absolute right-[13%] top-[8%] h-24 w-40 bg-[radial-gradient(circle,#2563FF_1.3px,transparent_1.6px)] bg-[length:10px_10px] opacity-[0.13]" />
            <div className="relative z-10 max-w-[58%] py-4 sm:max-w-[52%] sm:py-8 md:max-w-[48%]">
              <h1 className="text-[50px] font-black leading-[0.88] tracking-tight text-[#0B1220] sm:text-7xl">
                Crie sua <span className="block text-[#2563FF] drop-shadow-[0_10px_30px_rgba(37,99,255,0.24)]">conta</span>
              </h1>
              <p className="mt-5 max-w-[18rem] text-base font-semibold leading-7 text-[#475569] sm:text-lg sm:leading-8">
                Encontre ajuda, ofereca servicos e crie conexoes na sua regiao.
              </p>
            </div>
            <img
              src={BRAND.registrarConta}
              alt=""
              width={1024}
              height={682}
              loading="eager"
              decoding="async"
              fetchPriority="high"
              className="pointer-events-none absolute -right-3 top-1/2 z-0 h-[300px] w-auto max-w-[58%] -translate-y-1/2 object-contain object-center opacity-85 drop-shadow-[0_28px_54px_rgba(37,99,255,0.30)] sm:-right-4 sm:h-[380px] sm:max-w-[56%] md:-right-5 md:h-[420px] md:max-w-[54%]"
            />
            <Sparkles className="absolute right-[20%] top-8 h-5 w-5 fill-[#2563FF] text-[#2563FF]" />
            <Sparkles className="absolute bottom-10 left-[46%] h-4 w-4 fill-cyan-400 text-cyan-400" />
          </section>

          <section className="relative z-10 -mt-2 grid grid-cols-3 overflow-hidden rounded-[2rem] border border-white/80 bg-white/70 shadow-[0_14px_40px_rgba(15,23,42,0.04)] backdrop-blur-xl">
            {[
              { icon: ShieldCheck, title: 'Seguro', sub: 'e confiavel' },
              { icon: Zap, title: 'Rapido', sub: 'e facil' },
              { icon: UsersRound, title: 'Conecte-se', sub: 'na sua regiao' },
            ].map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <div key={benefit.title} className="relative flex flex-col items-center px-2 py-5 text-center">
                  {index > 0 ? <span className="absolute left-0 top-6 h-16 w-px bg-slate-200" /> : null}
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#2563FF] shadow-[0_12px_24px_rgba(37,99,255,0.10)] ring-1 ring-blue-100">
                    <Icon className="h-6 w-6" />
                  </span>
                  <span className="mt-3 text-sm font-black text-[#0B1220]">{benefit.title}</span>
                  <span className="mt-0.5 text-xs font-semibold text-[#64748B]">{benefit.sub}</span>
                </div>
              );
            })}
          </section>

          <section className="relative z-10 mt-7 rounded-[2rem] border border-[#E9EEF7] bg-white/92 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-7 lg:p-8">
            {error && (
              <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800 animate-in fade-in zoom-in-95 duration-200">
                <p>{error}</p>
                {errorKey === 'auth.errors.email_taken' ? (
                  <p className="mt-2">
                    <Link to={ROUTES.login} className="font-black text-red-900 underline underline-offset-2 hover:text-red-950">
                      {t('register_page.login_link')}
                    </Link>
                  </p>
                ) : null}
              </div>
            )}

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <h2 className="text-2xl font-black tracking-tight text-[#0B1220]">{t('register_page.account_type_heading')}</h2>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-[#64748B]">{t('register_page.account_type_sub')}</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <label
                  className={`relative flex cursor-pointer items-center gap-4 rounded-[1.45rem] border p-4 transition-all ${
                    userMode === 'client'
                      ? 'border-[#2563FF] bg-[#F4F8FF] shadow-[0_16px_42px_rgba(37,99,255,0.14)] ring-4 ring-blue-500/10'
                      : 'border-[#E9EEF7] bg-white shadow-[0_10px_26px_rgba(15,23,42,0.035)] hover:border-blue-200'
                  }`}
                >
                  <input type="radio" name="mode" value="client" className="sr-only" onChange={selectClientMode} checked={userMode === 'client'} />
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#F1F6FF] text-[#2563FF] shadow-inner">
                    <Search className="h-8 w-8" />
                  </span>
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block text-xl font-black text-[#0B1220]">{t('register_page.mode_client_title')}</span>
                    <span className="mt-1 block text-sm font-semibold leading-relaxed text-[#64748B]">{t('register_page.mode_client_sub')}</span>
                  </span>
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${
                      userMode === 'client' ? 'border-[#2563FF] bg-[#2563FF] text-white' : 'border-slate-200 bg-white text-transparent'
                    }`}
                  >
                    <CheckCircle2 className="h-5 w-5" />
                  </span>
                </label>

                <label
                  className={`relative flex cursor-pointer items-center gap-4 rounded-[1.45rem] border p-4 transition-all ${
                    userMode === 'helper'
                      ? 'border-[#2563FF] bg-[#F4F8FF] shadow-[0_16px_42px_rgba(37,99,255,0.14)] ring-4 ring-blue-500/10'
                      : 'border-[#E9EEF7] bg-white shadow-[0_10px_26px_rgba(15,23,42,0.035)] hover:border-blue-200'
                  }`}
                >
                  <input type="radio" name="mode" value="helper" className="sr-only" onChange={selectHelperMode} checked={userMode === 'helper'} />
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#F1F6FF] text-[#2563FF] shadow-inner">
                    <Briefcase className="h-8 w-8" />
                  </span>
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block text-xl font-black text-[#0B1220]">{t('register_page.mode_helper_title')}</span>
                    <span className="mt-1 block text-sm font-semibold leading-relaxed text-[#64748B]">{t('register_page.mode_helper_sub')}</span>
                  </span>
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${
                      userMode === 'helper' ? 'border-[#2563FF] bg-[#2563FF] text-white' : 'border-slate-200 bg-white text-transparent'
                    }`}
                  >
                    <CheckCircle2 className="h-5 w-5" />
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="name" className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-[#64748B]">
                    {t('register_page.full_name')}
                  </label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      disabled={submitting}
                      className="block min-h-[60px] w-full rounded-2xl border border-[#E9EEF7] bg-white px-5 py-4 pl-14 text-base font-semibold text-[#0B1220] placeholder:text-slate-400 transition focus:border-[#2563FF] focus:outline-none focus:ring-4 focus:ring-blue-500/10 disabled:opacity-60"
                      placeholder="Alex Dupont"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="email" className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-[#64748B]">
                    {t('login_page.email_label')}
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={submitting}
                      className="block min-h-[60px] w-full rounded-2xl border border-[#E9EEF7] bg-white px-5 py-4 pl-14 text-base font-semibold text-[#0B1220] placeholder:text-slate-400 transition focus:border-[#2563FF] focus:outline-none focus:ring-4 focus:ring-blue-500/10 disabled:opacity-60"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-[#64748B]">
                    {t('login_page.password_label')}
                  </label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      id="password"
                      name="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={submitting}
                      className="block min-h-[60px] w-full rounded-2xl border border-[#E9EEF7] bg-white px-5 py-4 pl-14 text-base font-semibold text-[#0B1220] placeholder:text-slate-400 transition focus:border-[#2563FF] focus:outline-none focus:ring-4 focus:ring-blue-500/10 disabled:opacity-60"
                      placeholder="********"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-[#64748B]">
                    {t('register_page.confirm_password')}
                  </label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={submitting}
                      className="block min-h-[60px] w-full rounded-2xl border border-[#E9EEF7] bg-white px-5 py-4 pl-14 text-base font-semibold text-[#0B1220] placeholder:text-slate-400 transition focus:border-[#2563FF] focus:outline-none focus:ring-4 focus:ring-blue-500/10 disabled:opacity-60"
                      placeholder="********"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="language" className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-[#64748B]">
                    {t('register_page.preferred_language')}
                  </label>
                  <div className="relative">
                    <Globe className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <select
                      id="language"
                      name="language"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as AppLanguage)}
                      disabled={submitting}
                      className="block min-h-[60px] w-full appearance-none rounded-2xl border border-[#E9EEF7] bg-white px-5 py-4 pl-14 text-base font-semibold text-[#0B1220] transition focus:border-[#2563FF] focus:outline-none focus:ring-4 focus:ring-blue-500/10 disabled:opacity-60"
                    >
                      {APP_UI_LANGUAGES.map((option) => (
                        <option key={option.code} value={option.code}>
                          {t(option.labelKey)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <CityRegionAutocomplete
                    label={t('register_page.city_region')}
                    value={city}
                    onChangeText={(text) => {
                      setCity(text);
                      setCityCanon('');
                      setProvince('');
                      setCountry('');
                    }}
                    onPickPlace={(p: QuebecPlace) => {
                      setCity(p.label);
                      setCityCanon(p.city);
                      setProvince(p.region);
                      setCountry(p.country);
                    }}
                    disabled={submitting}
                    placeholder={t('register_page.city_placeholder')}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!userMode || submitting || googleLoading}
                className="group flex min-h-[62px] w-full items-center justify-center gap-4 rounded-2xl bg-[linear-gradient(135deg,#2563FF,#0A5BFF)] px-5 text-base font-black text-white shadow-[0_18px_42px_rgba(37,99,255,0.34)] transition hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              >
                <span>{submitting ? t('common.loading') : 'Continuar'}</span>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 transition group-hover:translate-x-0.5">
                  <ArrowRight className="h-5 w-5" />
                </span>
              </button>

              <p className="flex items-center justify-center gap-2 text-center text-xs font-bold text-slate-500">
                <LockKeyhole className="h-4 w-4" />
                Seus dados estao protegidos e nunca serao compartilhados.
              </p>

              <p className="text-center text-sm font-semibold text-slate-500">
                {t('register_page.have_account')}{' '}
                <Link to={ROUTES.login} className="font-black text-[#2563FF] hover:text-blue-700">
                  {t('register_page.login_link')}
                </Link>
              </p>
            </form>

            <div className="mt-8">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs font-black uppercase tracking-wider text-slate-400">
                  <span className="bg-white px-4">{t('login_page.divider')}</span>
                </div>
              </div>

              <GoogleSignInButton className="mt-6" loading={googleLoading} disabled={submitting} onClick={() => void handleGoogle()} />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
