import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, ArrowLeft, Globe, Briefcase, Search, CheckCircle2 } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { ROUTES } from '@/utils/constants';
import { writeStoredAppMode } from '@/utils/appModeStorage';
import { dashboardPathForRole, normalizeProfileRole, resolveEffectiveRole } from '@/utils/userRole';
import { useAuth } from '@/context/AuthContext';
import { CityRegionAutocomplete } from '@/components/common/CityRegionAutocomplete';
import type { QuebecPlace } from '@/data/quebecRegions';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { getSupabase } from '@/lib/supabase';
import { HelperTermsGateModal } from '@/components/auth/HelperTermsGateModal';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
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
  const [acceptedClientTerms, setAcceptedClientTerms] = useState(false);
  const [helperLegalOk, setHelperLegalOk] = useState(false);
  const [helperModalOpen, setHelperModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const selectClientMode = () => {
    setUserMode('client');
    setHelperLegalOk(false);
    setHelperModalOpen(false);
  };

  const selectHelperMode = () => {
    setUserMode('helper');
    if (!helperLegalOk) setHelperModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!userMode) {
      setError(t('auth.register_need_mode'));
      return;
    }
    if (userMode === 'client' && !acceptedClientTerms) {
      setError(t('auth.register_need_terms_client'));
      return;
    }
    if (userMode === 'helper' && !helperLegalOk) {
      setError(t('auth.register_need_terms_helper'));
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
    setSubmitting(true);
    const now = new Date().toISOString();
    const ut = userMode === 'helper' ? 'helper' : 'client';
    const err = await signUpWithEmail(email, password, {
      fullName,
      userType: ut,
      city: cityCanon.trim() || city.trim(),
      region: province.trim(),
      country: country.trim(),
      acceptedTerms: userMode === 'client' ? acceptedClientTerms : true,
      acceptedTermsAt: now,
      helperTermsAccepted: ut === 'helper',
      helperTermsAcceptedAt: ut === 'helper' ? now : undefined,
      preferredLanguage: language,
    });
    setSubmitting(false);
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
      if (import.meta.env.DEV && err.devRaw) console.info('[LinkHelp] signUp raw:', err.devRaw);
      return;
    }

    const sb = getSupabase();
    if (sb) {
      const {
        data: { session },
      } = await sb.auth.getSession();
      if (session) {
        writeStoredAppMode(ut, session.user.id);
        navigate(dashboardPathForRole(ut), { replace: true });
        showToast(t('register_page.welcome'), 'success');
        return;
      }
    }
    navigate(ROUTES.login, { replace: true, state: { registered: true } });
  };

  const handleGoogle = async () => {
    console.log('[Google OAuth] Button clicked');
    setError(null);
    if (!isConfigured) {
      showToast(t('auth.errors.env_not_ready'), 'info');
      return;
    }
    setGoogleLoading(true);
    const loadingGuard = window.setTimeout(() => setGoogleLoading(false), 15_000);
    try {
      const err = await signInWithGoogle();
      if (err?.code === 'unavailable') showToast(t('auth.errors.env_not_ready'), 'info');
      else if (err) {
        const msg = t(err.messageKey, err.vars);
        setError(msg);
        showToast(err.devRaw ? `${msg} (${err.devRaw})` : msg, 'error');
        if (err.devRaw) console.info('[LinkHelp] Google OAuth raw:', err.devRaw);
      }
    } finally {
      window.clearTimeout(loadingGuard);
      setGoogleLoading(false);
    }
  };

  return (
    <div className="lh-auth-bg min-h-[100dvh] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative">
      <HelperTermsGateModal
        open={helperModalOpen}
        onClose={() => {
          setHelperModalOpen(false);
          if (!helperLegalOk) setUserMode(null);
        }}
        onConfirm={() => {
          setHelperLegalOk(true);
          setHelperModalOpen(false);
        }}
      />

      <Link
        to={ROUTES.home}
        className="absolute top-8 left-8 flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl transition-colors hover:bg-white/[0.1] hover:text-white z-10"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-semibold">{t('login_page.back_home')}</span>
      </Link>

      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Logo className="mb-4" iconClassName="w-12 h-12" textClassName="text-3xl font-bold" tone="light" />
        <h2 className="text-center text-3xl font-black tracking-tight text-white mt-2">{t('register_page.title')}</h2>
        <p className="mt-2 text-center text-sm text-slate-200/88 max-w-sm leading-relaxed">{t('register_page.subtitle')}</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-[500px] animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="bg-white/[0.82] backdrop-blur-3xl py-8 px-4 shadow-[0_36px_120px_rgba(0,0,0,0.48)] sm:rounded-3xl sm:px-10 border border-white/35 ring-1 ring-white/45">
          {error && (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 font-medium animate-in fade-in zoom-in-95 duration-200">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
              <h3 className="text-base font-black text-slate-900">{t('register_page.account_type_heading')}</h3>
              <p className="mt-1 text-xs font-medium text-slate-500">{t('register_page.account_type_sub')}</p>
                            <div className="mt-4 grid grid-cols-1 gap-3">
                <label
                  className={`relative flex cursor-pointer rounded-2xl border p-4 shadow-sm transition-all hover:shadow-md hover:border-slate-300 ${
                    userMode === 'client' ? 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/20' : 'border-slate-200 bg-white'
                  }`}
                >
                  <input type="radio" name="mode" value="client" className="sr-only" onChange={selectClientMode} checked={userMode === 'client'} />
                  <span className="flex flex-1 items-center gap-3">
                                        <div
                      className={`p-2.5 rounded-xl flex items-center justify-center transition-colors ${
                        userMode === 'client' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <Search className="w-5 h-5" />
                    </div>
                    <span className="flex flex-col text-left">
                      <span className="block text-sm font-bold text-slate-900">{t('register_page.mode_client_title')}</span>
                      <span className="block text-xs font-medium text-slate-500 mt-0.5">{t('register_page.mode_client_sub')}</span>
                    </span>
                  </span>
                  {userMode === 'client' ? <CheckCircle2 className="h-5 w-5 text-blue-600 absolute right-4 top-1/2 -translate-y-1/2" /> : null}
                </label>

                <label
                  className={`relative flex cursor-pointer rounded-2xl border p-4 shadow-sm transition-all hover:shadow-md hover:border-slate-300 ${
                    userMode === 'helper' ? 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/20' : 'border-slate-200 bg-white'
                  }`}
                >
                  <input type="radio" name="mode" value="helper" className="sr-only" onChange={selectHelperMode} checked={userMode === 'helper'} />
                  <span className="flex flex-1 items-center gap-3">
                    <div
                      className={`p-2.5 rounded-xl flex items-center justify-center transition-colors ${
                        userMode === 'helper' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <span className="flex flex-col text-left">
                      <span className="block text-sm font-bold text-slate-900">{t('register_page.mode_helper_title')}</span>
                      <span className="block text-xs font-medium text-slate-500 mt-0.5">{t('register_page.mode_helper_sub')}</span>
                    </span>
                  </span>
                  {userMode === 'helper' ? <CheckCircle2 className="h-5 w-5 text-blue-600 absolute right-4 top-1/2 -translate-y-1/2" /> : null}
                </label>
              </div>
            </section>

            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">
                  {t('register_page.full_name')}
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={submitting}
                  className="block w-full rounded-2xl border border-slate-200 px-4 py-3.5 placeholder:text-slate-400 shadow-inner text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50/80 hover:bg-slate-50/90 transition-colors disabled:opacity-60"
                  placeholder="Alex Dupont"
                />
              </div>

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
                    className="block w-full rounded-2xl border border-slate-200 px-4 py-3.5 pl-11 placeholder:text-slate-400 shadow-inner text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50/80 hover:bg-slate-50/90 transition-colors disabled:opacity-60"
                    placeholder="you@example.com"
                  />
                  <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">
                  {t('login_page.password_label')}
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                  className="block w-full rounded-2xl border border-slate-200 px-4 py-3.5 placeholder:text-slate-400 shadow-inner text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50/80 hover:bg-slate-50/90 transition-colors disabled:opacity-60"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">
                  {t('register_page.confirm_password')}
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={submitting}
                  className="block w-full rounded-2xl border border-slate-200 px-4 py-3.5 placeholder:text-slate-400 shadow-inner text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50/80 hover:bg-slate-50/90 transition-colors disabled:opacity-60"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="language" className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">
                  {t('register_page.preferred_language')}
                </label>
                <div className="relative">
                  <select
                    id="language"
                    name="language"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as AppLanguage)}
                    disabled={submitting}
                    className="block w-full appearance-none rounded-2xl border border-slate-200 px-4 py-3.5 pl-11 shadow-inner text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50/80 hover:bg-slate-50/90 transition-colors disabled:opacity-60"
                  >
                    <option value="pt">Português</option>
                    <option value="en">English</option>
                    <option value="fr">Français</option>
                  </select>
                  <Globe className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
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

            {userMode === 'client' ? (
              <label className="flex gap-3 cursor-pointer items-start rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3.5 text-sm text-slate-800 font-medium leading-snug hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  checked={acceptedClientTerms}
                  onChange={(e) => setAcceptedClientTerms(e.target.checked)}
                  disabled={submitting}
                />
                <span>{t('auth.client_terms_checkbox')}</span>
              </label>
            ) : null}

            <div className="pt-1">
              <button
                type="submit"
                disabled={!userMode || submitting || googleLoading}
                className="flex w-full justify-center rounded-2xl bg-slate-900 py-3.5 px-4 text-sm font-bold text-white shadow-lg shadow-slate-900/20 hover:bg-black hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 min-h-[52px]"
              >
                {submitting ? t('common.loading') : t('register_page.submit')}
              </button>
            </div>

            <p className="text-center text-sm text-slate-500">
              {t('register_page.have_account')}{' '}
              <Link to={ROUTES.login} className="font-bold text-blue-600 hover:text-blue-700 transition-colors">
                {t('register_page.login_link')}
              </Link>
            </p>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs font-bold uppercase tracking-wider text-slate-400">
                <span className="bg-white px-4">{t('login_page.divider')}</span>
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
  );
}
