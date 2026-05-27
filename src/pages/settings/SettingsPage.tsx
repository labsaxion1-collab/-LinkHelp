import { useEffect, useRef, useState, type ReactNode } from 'react';
import { FilePickerLabel } from '@/components/common/HiddenFileInput';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  GraduationCap,
  Bell,
  User,
  Loader2,
  Camera,
  LogOut,
  Languages,
  Briefcase,
  Image,
  CheckCircle2,
} from 'lucide-react';
import { UI_VISIBILITY } from '@/config/uiVisibility';
import { useLanguage } from '@/context/LanguageContext';
import { ROUTES } from '@/utils/constants';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { fileFromDataUrl, formatStorageError, uploadAvatarImage } from '@/lib/storageUpload';
import { logMediaPicker } from '@/utils/mediaPickerDebug';
import { cropSquareAvatarFromFile } from '@/utils/portfolioMediaProcessing';
import { CityRegionAutocomplete } from '@/components/common/CityRegionAutocomplete';
import { ProfilePhoneField } from '@/components/profile/ProfilePhoneField';
import type { QuebecPlace } from '@/data/quebecRegions';
import { parseStoredPhone, validatePhoneNumber } from '@/utils/phoneFormat';
import { ProfileRewardsProgress } from '@/components/rewards/ProfileRewardsProgress';
import { HelperScorePanel } from '@/components/features/HelperScorePanel';
import { useOnboardingRewards } from '@/hooks/useOnboardingRewards';
import { fetchHelperSkills } from '@/services/supabase/helperSkillsRemote';
import { formatLinkCredits } from '@/utils/formatLinkCredits';
import { SIGNUP_BONUS_LC } from '@/config/onboardingRewards';
import { AppPageShell } from '@/components/design-system/AppPageShell';
import { DesktopBackButton } from '@/components/layout/DesktopBackButton';
import { SERVICE_CATEGORIES, type ServiceCategoryId } from '@/data/serviceCategories';
import { getCategoryLucideIcon } from '@/utils/categoryIcons';
import { HELPER_CATEGORY_ACCENTS, getHelperCategoryPreferences } from '@/utils/helperCategoryPreferences';

const SPOKEN_LANGUAGE_OPTIONS = [
  { id: 'pt', label: 'Português' },
  { id: 'en', label: 'English' },
  { id: 'fr', label: 'Français' },
  { id: 'es', label: 'Español' },
] as const;

function SettingsCard({
  icon,
  title,
  children,
  id,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="lh-glass-card-solid p-5">
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <h2 className="text-base font-black text-gray-900">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default function SettingsPage() {
  const { t, language, setLanguage } = useLanguage();
  const { profile, updateProfile, signOut, session, isConfigured, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const { evaluateProfileRewards } = useOnboardingRewards();
  const [helperSkillCount, setHelperSkillCount] = useState(0);
  const [helperSkillIds, setHelperSkillIds] = useState<string[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [avatarSelectedFile, setAvatarSelectedFile] = useState<File | null>(null);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const avatarObjectUrlRef = useRef<string | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState<string | null>(null);
  const [cityDisplay, setCityDisplay] = useState('');
  const [cityCanon, setCityCanon] = useState('');
  const [province, setProvince] = useState('');
  const [country, setCountry] = useState('');
  const [bio, setBio] = useState('');
  const [spokenLanguages, setSpokenLanguages] = useState<string[]>([]);
  const [primaryCategory, setPrimaryCategory] = useState<ServiceCategoryId>('cleaning');
  const [secondaryCategories, setSecondaryCategories] = useState<ServiceCategoryId[]>([]);
  const [notifOn, setNotifOn] = useState(true);
  const [saving, setSaving] = useState(false);

  const isHelper = profile?.role === 'helper';

  useEffect(() => {
    if (!profile) return;
    const meta = (session?.user?.user_metadata ?? {}) as Record<string, unknown>;
    const metaName =
      typeof meta.full_name === 'string' ? meta.full_name : typeof meta.name === 'string' ? meta.name : '';
    setName(profile.name?.trim() || metaName || '');
    setPhone(profile.phone ?? null);
    const c = profile.city ?? '';
    setCityDisplay(c);
    setCityCanon(c);
    setProvince(profile.region ?? '');
    setCountry(profile.country ?? '');
    setBio(profile.bio ?? '');
    setSpokenLanguages(
      Array.isArray(profile.spoken_languages) && profile.spoken_languages.length
        ? profile.spoken_languages
        : profile.preferred_language
          ? [profile.preferred_language]
          : [language],
    );
  }, [profile, session, language]);

  useEffect(() => {
    if (!profile || !isHelper) return;
    const prefs = getHelperCategoryPreferences(profile, helperSkillIds);
    setPrimaryCategory(prefs.primaryCategory);
    setSecondaryCategories(prefs.secondaryCategories);
  }, [profile, isHelper, helperSkillIds]);

  useEffect(() => {
    if (location.hash === '#avatar') {
      requestAnimationFrame(() =>
        document.getElementById('settings-avatar')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      );
    }
  }, [location.hash, location.pathname]);

  const avatarDisplay = avatarPreviewUrl ?? profile?.avatar_url?.trim() ?? null;

  const revokeAvatarObjectUrl = () => {
    if (avatarObjectUrlRef.current) {
      URL.revokeObjectURL(avatarObjectUrlRef.current);
      avatarObjectUrlRef.current = null;
    }
    setAvatarPreviewUrl(null);
  };

  useEffect(() => () => revokeAvatarObjectUrl(), []);

  useEffect(() => {
    if (!session?.user?.id || !isHelper || !isConfigured) {
      setHelperSkillCount(0);
      setHelperSkillIds([]);
      return;
    }
    void fetchHelperSkills(session.user.id).then((keys) => {
      setHelperSkillIds(keys);
      setHelperSkillCount(keys.length);
    });
  }, [session?.user?.id, isHelper, isConfigured]);

  const authEmail = session?.user?.email?.trim() ?? '';
  const signupBonusLc = isHelper ? SIGNUP_BONUS_LC.helper : SIGNUP_BONUS_LC.client;

  const saveAccount = async () => {
    const { countryId, nationalNumber } = parseStoredPhone(phone);
    const phoneValidation = validatePhoneNumber(countryId, nationalNumber);
    if (phone?.trim() && !phoneValidation.valid) {
      showToast(t('profile_form.phone_invalid'), 'error');
      return;
    }

    if (!isConfigured || !profile) {
      showToast(t('app_pages.settings_saved'), 'info');
      return;
    }
    setSaving(true);
    const base = {
      name: name.trim() || null,
      phone: phone?.trim() ? phone.trim() : null,
      city: (cityCanon.trim() || cityDisplay.trim()) || null,
      region: province.trim() || null,
      country: country.trim() || null,
      preferred_language: language,
    };
    const normalizedSecondary = secondaryCategories.filter((id) => id !== primaryCategory);
    const err = await updateProfile(
      isHelper
        ? {
            ...base,
            bio: bio.trim() || null,
            spoken_languages: spokenLanguages.length ? spokenLanguages : [language],
            primary_category: primaryCategory,
            secondary_categories: normalizedSecondary,
          }
        : base,
    );
    setSaving(false);
    if (err) showToast(t(err.messageKey, err.vars), 'error');
    else {
      await refreshProfile();
      showToast(t('app_pages.settings_saved'), 'success');
      if (isHelper) {
        void evaluateProfileRewards({
          avatarUrl: profile?.avatar_url,
          bio: bio.trim() || null,
          phone: phone?.trim() ? phone.trim() : null,
          skillCount: helperSkillCount,
        });
      }
    }
  };

  const logout = async () => {
    await signOut();
    showToast(t('nav.toast_logout'), 'success');
    navigate(ROUTES.home, { replace: true });
  };

  useEffect(() => {
    if (!avatarSelectedFile) return;
    logMediaPicker('SELECTED FILE STATE UPDATED', { name: avatarSelectedFile.name, size: avatarSelectedFile.size });
    if (avatarPreviewUrl) logMediaPicker('SAVE ENABLED');
  }, [avatarSelectedFile, avatarPreviewUrl]);

  const onAvatarFile = (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    revokeAvatarObjectUrl();
    const preview = URL.createObjectURL(f);
    avatarObjectUrlRef.current = preview;
    setAvatarSelectedFile(f);
    setAvatarPreviewUrl(preview);
    logMediaPicker('PREVIEW CREATED', preview);
  };

  const saveAvatar = async () => {
    if (!avatarSelectedFile || !isConfigured || !session?.user?.id) return;
    setAvatarSaving(true);
    try {
      let uploadFile: File = avatarSelectedFile;
      try {
        const cropped = await cropSquareAvatarFromFile(avatarSelectedFile);
        uploadFile = await fileFromDataUrl(cropped, 'avatar.jpg', 'image/jpeg');
      } catch {
        logMediaPicker('CROP FALLBACK — uploading original file');
      }
      const { publicUrl } = await uploadAvatarImage(session.user.id, uploadFile);
      const err = await updateProfile({ avatar_url: publicUrl });
      if (err) {
        showToast(t(err.messageKey, err.vars), 'error');
        return;
      }
      await refreshProfile();
      revokeAvatarObjectUrl();
      setAvatarSelectedFile(null);
      showToast(t('app_pages.settings_avatar_saved'), 'success');
      if (isHelper) {
        void evaluateProfileRewards({
          avatarUrl: publicUrl,
          bio: bio.trim() || null,
          phone: phone?.trim() ? phone.trim() : null,
          skillCount: helperSkillCount,
        });
      }
    } catch (e) {
      const raw = formatStorageError(e);
      showToast(raw && raw !== 'NO_SUPABASE' ? raw : t('profile_setup.avatar_save_error'), 'error');
    } finally {
      setAvatarSaving(false);
    }
  };

  return (
    <AppPageShell className="min-h-[calc(100dvh-64px)]">
      <div className="mx-auto max-w-lg space-y-4">
        <DesktopBackButton />
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-1 flex items-center gap-2 text-sm font-bold text-gray-500 transition-colors hover:text-gray-900 lg:hidden"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('nav.back')}
        </button>

        <header className="pb-1">
          <h1 className="text-2xl font-black tracking-tight text-gray-900">{t('app_pages.settings_title')}</h1>
          <p className="mt-1 text-sm font-medium text-gray-500">{t('app_pages.settings_sub')}</p>
        </header>

        {isHelper ? <ProfileRewardsProgress skillCount={helperSkillCount} /> : null}

        {isConfigured && profile && isHelper ? (
          <section className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/80 to-white p-4 shadow-sm">
            <p className="text-sm font-bold text-blue-900">
              {t('rewards.signup_balance', {
                amount: formatLinkCredits(profile.credits ?? signupBonusLc, language),
              })}
            </p>
          </section>
        ) : null}

        <SettingsCard icon={<User className="h-5 w-5 text-blue-600" />} title={t('app_pages.settings_account')}>
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-gray-700">
              {t('app_pages.settings_name')}
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
              />
            </label>
            {authEmail ? (
              <p className="text-xs text-gray-500">
                {t('app_pages.settings_email')}: <span className="font-semibold text-gray-700">{authEmail}</span>
              </p>
            ) : null}
            <ProfilePhoneField
              label={t('app_pages.settings_phone')}
              value={phone}
              onChange={setPhone}
              disabled={!isConfigured || saving}
              t={t}
            />
            <CityRegionAutocomplete
              label={t('app_pages.settings_city')}
              value={cityDisplay}
              onChangeText={(text) => {
                setCityDisplay(text);
                setCityCanon('');
                setProvince('');
                setCountry('');
              }}
              onPickPlace={(p: QuebecPlace) => {
                setCityDisplay(p.label);
                setCityCanon(p.city);
                setProvince(p.region);
                setCountry(p.country);
              }}
              disabled={!isConfigured}
              placeholder={t('profile_form.city_placeholder')}
            />
          </div>
        </SettingsCard>

        <SettingsCard
          id="settings-avatar"
          icon={<Camera className="h-5 w-5 text-violet-600" />}
          title={t('app_pages.settings_avatar_title')}
        >
          <p className="mb-4 text-sm text-gray-600">{t('app_pages.settings_avatar_hint')}</p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <div className="relative shrink-0">
              <FilePickerLabel
                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                disabled={!isConfigured || avatarSaving}
                onFiles={onAvatarFile}
                className="h-24 w-24 overflow-hidden rounded-full border-4 border-gray-100 bg-gray-100 shadow-inner"
              >
                {avatarDisplay ? (
                  <img src={avatarDisplay} alt="" className="pointer-events-none h-full w-full object-cover" />
                ) : (
                  <div className="pointer-events-none flex h-full w-full items-center justify-center text-gray-400">
                    <User className="h-10 w-10" />
                  </div>
                )}
                {avatarSaving ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Loader2 className="h-7 w-7 animate-spin text-white" />
                  </div>
                ) : null}
              </FilePickerLabel>
            </div>
            <div className="w-full min-w-0 space-y-2 sm:flex-1">
              <FilePickerLabel
                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                disabled={!isConfigured || avatarSaving}
                onFiles={onAvatarFile}
                className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-800 hover:bg-gray-50 sm:w-auto"
              >
                {t('app_pages.settings_avatar_choose')}
              </FilePickerLabel>
              <button
                type="button"
                disabled={!avatarSelectedFile || avatarSaving || !isConfigured}
                onClick={() => void saveAvatar()}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50 sm:w-auto"
              >
                {avatarSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {t('app_pages.settings_avatar_save')}
              </button>
            </div>
          </div>
        </SettingsCard>

        {isHelper ? (
          <>
            <SettingsCard icon={<User className="h-5 w-5 text-violet-600" />} title={t('app_pages.settings_profile')}>
              <label className="block text-sm font-semibold text-gray-700">
                {t('app_pages.settings_bio')}
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                />
              </label>
            </SettingsCard>

            <SettingsCard
              icon={<Briefcase className="h-5 w-5 text-blue-600" />}
              title={t('helper_categories.title')}
            >
              <div className="space-y-5">
                <div>
                  <div className="mb-3">
                    <p className="text-sm font-black text-slate-900">{t('helper_categories.primary_label')}</p>
                    <p className="text-xs font-semibold text-slate-500">{t('helper_categories.primary_hint')}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {SERVICE_CATEGORIES.map((cat) => {
                      const IconComponent = getCategoryLucideIcon(cat.icon);
                      const active = primaryCategory === cat.id;
                      const accent = HELPER_CATEGORY_ACCENTS[cat.id];
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setPrimaryCategory(cat.id);
                            setSecondaryCategories((prev) => prev.filter((id) => id !== cat.id));
                          }}
                          className={`group min-h-[96px] rounded-2xl border p-3 text-left transition-all ${
                            active
                              ? `${accent.active} shadow-sm ${accent.glow}`
                              : 'border-white/70 bg-white/70 text-slate-700 hover:border-blue-200 hover:bg-white'
                          }`}
                        >
                          <span
                            className={`mb-3 flex h-11 w-11 items-center justify-center rounded-2xl shadow-sm transition-transform group-hover:scale-105 ${
                              active ? accent.icon : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            <IconComponent className="h-5 w-5" />
                          </span>
                          <span className="block text-sm font-black leading-tight">{t(`categories.${cat.id}`)}</span>
                          {active ? (
                            <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {t('helper_categories.selected_primary')}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="mb-3">
                    <p className="text-sm font-black text-slate-900">{t('helper_categories.secondary_label')}</p>
                    <p className="text-xs font-semibold text-slate-500">{t('helper_categories.secondary_hint')}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {SERVICE_CATEGORIES.filter((cat) => cat.id !== primaryCategory).map((cat) => {
                      const IconComponent = getCategoryLucideIcon(cat.icon);
                      const active = secondaryCategories.includes(cat.id);
                      const accent = HELPER_CATEGORY_ACCENTS[cat.id];
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() =>
                            setSecondaryCategories((prev) =>
                              prev.includes(cat.id)
                                ? prev.filter((id) => id !== cat.id)
                                : [...prev, cat.id],
                            )
                          }
                          className={`inline-flex min-h-[42px] items-center gap-2 rounded-2xl border px-3 text-xs font-black transition-all ${
                            active
                              ? `${accent.active} shadow-sm`
                              : 'border-white/70 bg-white/70 text-slate-600 hover:border-blue-200 hover:bg-white'
                          }`}
                        >
                          <IconComponent className="h-4 w-4" />
                          {t(`categories.${cat.id}`)}
                          {active ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : null}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-3 text-xs font-bold text-blue-700">
                    {t('helper_categories.secondary_count', { count: secondaryCategories.length })}
                  </p>
                </div>
              </div>
            </SettingsCard>

            <SettingsCard icon={<Briefcase className="h-5 w-5 text-sky-600" />} title={t('app_pages.settings_helper_extras')}>
              <div className="space-y-3 text-sm">
                <Link
                  to={ROUTES.helperDashboard}
                  className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 font-bold text-gray-800 transition-colors hover:border-blue-200 hover:bg-blue-50/50"
                >
                  {t('app_pages.settings_skills_link')}
                  <span className="text-blue-600">→</span>
                </Link>
                <Link
                  to={ROUTES.helperDashboard}
                  className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 font-bold text-gray-800 transition-colors hover:border-blue-200 hover:bg-blue-50/50"
                >
                  <span className="inline-flex items-center gap-2">
                    <Image className="h-4 w-4 text-sky-600" />
                    {t('app_pages.settings_portfolio_link')}
                  </span>
                  <span className="text-blue-600">→</span>
                </Link>
              </div>
            </SettingsCard>

            <HelperScorePanel />
          </>
        ) : null}

        <SettingsCard icon={<Bell className="h-5 w-5 text-amber-500" />} title={t('app_pages.settings_preferences')}>
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-gray-700">
              {t('app_pages.settings_lang')}
              <select
                value={language}
                onChange={(e) => {
                  const next = e.target.value as 'en' | 'pt' | 'fr';
                  setLanguage(next);
                  if (isHelper) {
                    setSpokenLanguages((prev) => (prev.length ? prev : [next]));
                  }
                }}
                className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
              >
                <option value="en">English</option>
                <option value="pt">Português</option>
                <option value="fr">Français</option>
              </select>
            </label>

            {isHelper ? (
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                  <Languages className="h-4 w-4 text-blue-600" />
                  {t('app_pages.settings_spoken_languages')}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {SPOKEN_LANGUAGE_OPTIONS.map((option) => {
                    const active = spokenLanguages.includes(option.id);
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() =>
                          setSpokenLanguages((prev) =>
                            prev.includes(option.id)
                              ? prev.filter((id) => id !== option.id)
                              : [...prev, option.id],
                          )
                        }
                        className={`rounded-xl border px-3 py-2 text-sm font-bold transition-colors ${
                          active
                            ? 'border-blue-600 bg-blue-50 text-blue-900'
                            : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-white'
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-3">
              <input
                type="checkbox"
                checked={notifOn}
                onChange={(e) => setNotifOn(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm font-medium text-gray-800">{t('app_pages.settings_notif')}</span>
            </label>
          </div>
        </SettingsCard>

        <button
          type="button"
          disabled={saving || !isConfigured}
          onClick={() => void saveAccount()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3.5 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {t('app_pages.settings_save')}
        </button>

        {isHelper && UI_VISIBILITY.training ? (
          <Link
            to={ROUTES.helperTraining}
            className="block rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm transition-all hover:border-indigo-200 hover:shadow-md"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-black text-gray-900">{t('training.page_title')}</h2>
                <p className="mt-1 text-sm font-medium text-gray-500">{t('training.settings_teaser')}</p>
              </div>
            </div>
          </Link>
        ) : null}

        <button
          type="button"
          onClick={() => void logout()}
          className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm font-bold text-red-700 hover:bg-red-100"
        >
          <LogOut className="h-4 w-4" />
          {t('app_pages.settings_logout')}
        </button>
      </div>
    </AppPageShell>
  );
}
