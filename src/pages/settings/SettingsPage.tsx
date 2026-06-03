import { useEffect, useRef, useState, useMemo, type ReactNode } from 'react';
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
  Coins,
  TrendingUp,
  BarChart3,
  ArrowUpRight,
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
import { HelperScorePanel } from '@/components/features/HelperScorePanel';
import { Star } from 'lucide-react';
import { useOnboardingRewards } from '@/hooks/useOnboardingRewards';
import { useWalletBalance } from '@/hooks/useWalletBalance';
import { fetchHelperSkills, syncHelperSkills } from '@/services/supabase/helperSkillsRemote';
import { formatLinkCredits } from '@/utils/formatLinkCredits';
import { SIGNUP_BONUS_LC } from '@/config/onboardingRewards';
import { AppPageShell } from '@/components/design-system/AppPageShell';
import { DesktopBackButton } from '@/components/layout/DesktopBackButton';
import { type ServiceCategoryId } from '@/data/serviceCategories';
import { getHelperCategoryPreferences, deriveHelperCategoriesFromSkillKeys } from '@/utils/helperCategoryPreferences';
import { HelperCategoriesManager } from '@/components/helper/HelperCategoriesManager';
import { ByFluxBadge } from '@/components/brand/ByFluxBadge';
import { filterValidSkillKeys } from '@/data/helperSkillsCatalog';
import {
  HelperBaseAddressInput,
  helperBaseAddressFromProfile,
  type HelperBaseAddressValue,
} from '@/components/helper/HelperBaseAddressInput';
import {
  getHelperBaseChangeStatus,
  helperBaseFieldsChanged,
  helperBaseIsConfigured,
} from '@/utils/helperBaseAddressLock';
import {
  HelperBaseAddressLockedError,
  syncHelperBaseAddress,
} from '@/services/supabase/helperBaseAddressRemote';

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
  useOnboardingRewards();
  const { balance: helperWalletBalance, loading: creditsLoading } = useWalletBalance();
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
  const [helperBaseValue, setHelperBaseValue] = useState<HelperBaseAddressValue>(() =>
    helperBaseAddressFromProfile({}),
  );
  const [baseAddressSaving, setBaseAddressSaving] = useState(false);
  const [notifOn, setNotifOn] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creditProjectionOpen, setCreditProjectionOpen] = useState(false);

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
    setHelperBaseValue(helperBaseAddressFromProfile(profile));
  }, [profile, session, language]);

  const baseChangeStatus = useMemo(() => getHelperBaseChangeStatus(profile), [profile]);
  const baseConfigured = useMemo(() => helperBaseIsConfigured(profile), [profile]);
  const baseFieldsLocked =
    !baseChangeStatus.allowed && baseChangeStatus.reason === 'locked' && baseConfigured;
  const baseHasPendingChanges = useMemo(
    () =>
      helperBaseFieldsChanged(profile, {
        address: helperBaseValue.address,
        city: helperBaseValue.city,
        province: helperBaseValue.province,
        postalCode: helperBaseValue.postalCode,
        lat: helperBaseValue.latitude,
        lng: helperBaseValue.longitude,
      }),
    [profile, helperBaseValue],
  );

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
    if (err) {
      showToast(t(err.messageKey, err.vars), 'error');
      return;
    }
    await refreshProfile();
    showToast(t('app_pages.settings_saved'), 'success');
  };

  const saveHelperBaseAddress = async () => {
    if (!isConfigured || !profile || !isHelper) {
      showToast(t('app_pages.settings_saved'), 'info');
      return;
    }
    if (!helperBaseValue.address.trim() && !helperBaseValue.city.trim()) {
      showToast(t('app_pages.settings_helper_base_required'), 'error');
      return;
    }
    if (
      !baseChangeStatus.allowed &&
      baseChangeStatus.reason === 'locked' &&
      baseHasPendingChanges
    ) {
      showToast(t('app_pages.settings_helper_base_lock_message'), 'error');
      return;
    }
    if (!baseHasPendingChanges) {
      showToast(t('app_pages.settings_helper_base_no_changes'), 'info');
      return;
    }
    setBaseAddressSaving(true);
    try {
      await syncHelperBaseAddress({
        address: helperBaseValue.address.trim() || null,
        city: helperBaseValue.city.trim() || null,
        province: helperBaseValue.province.trim() || null,
        postalCode: helperBaseValue.postalCode.trim() || null,
        lat: helperBaseValue.latitude,
        lng: helperBaseValue.longitude,
      });
      const refreshed = await refreshProfile();
      if (refreshed) setHelperBaseValue(helperBaseAddressFromProfile(refreshed));
      showToast(t('app_pages.settings_helper_base_saved'), 'success');
    } catch (e) {
      if (e instanceof HelperBaseAddressLockedError) {
        showToast(t('app_pages.settings_helper_base_lock_message'), 'error');
      } else {
        const msg = e instanceof Error ? e.message : String(e);
        showToast(msg || t('app_pages.settings_helper_base_save_error'), 'error');
      }
    } finally {
      setBaseAddressSaving(false);
    }
  };

  const persistHelperSkills = async (
    ids: string[],
    categoryOverride?: { primary: ServiceCategoryId; secondary: ServiceCategoryId[] },
  ) => {
    const valid = filterValidSkillKeys(ids);
    setHelperSkillIds(valid);
    setHelperSkillCount(valid.length);
    const { primary, secondary } = categoryOverride ?? deriveHelperCategoriesFromSkillKeys(valid, primaryCategory);
    setPrimaryCategory(primary);
    setSecondaryCategories(secondary);
    if (!session?.user?.id || !isConfigured) {
      if (valid.length > 0) showToast(t('helper_categories.saved_ok'), 'success');
      return;
    }
    try {
      await syncHelperSkills(session.user.id, valid);
      const err = await updateProfile({
        primary_category: primary,
        secondary_categories: secondary,
      });
      if (err) throw new Error(t(err.messageKey, err.vars));
      await refreshProfile();
      const synced = await fetchHelperSkills(session.user.id);
      setHelperSkillIds(synced);
      setHelperSkillCount(synced.length);
      const syncedCats = deriveHelperCategoriesFromSkillKeys(synced, primary);
      setPrimaryCategory(syncedCats.primary);
      setSecondaryCategories(syncedCats.secondary);
      showToast(t('helper_categories.saved_ok'), 'success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      showToast(msg || t('helper_categories.save_error'), 'error');
      throw e;
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
    } catch (e) {
      const raw = formatStorageError(e);
      showToast(raw && raw !== 'NO_SUPABASE' ? raw : t('profile_setup.avatar_save_error'), 'error');
    } finally {
      setAvatarSaving(false);
    }
  };

  const helperCreditBalance = helperWalletBalance ?? 0;
  const helperCreditBalanceLabel = creditsLoading ? t('common.loading') : formatLinkCredits(helperCreditBalance, language);
  const helperCreditGraphBars = [32, 46, 38, 58, 52, 72, 64];
  const helperProjectedJobs = Math.max(1, Math.round(helperCreditBalance / 6));
  const helperProjectedRevenue = helperProjectedJobs * 85;

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
          {profile?.rating != null && profile.rating > 0 ? (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-amber-100 bg-amber-50 px-3 py-1.5 text-sm font-bold text-amber-800">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              {t('service_review.profile_rating')}: {profile.rating.toFixed(1)}
            </p>
          ) : (
            <p className="mt-2 text-xs font-medium text-slate-500">{t('service_review.no_rating_yet')}</p>
          )}
        </header>

        {isConfigured && profile && isHelper ? (
          <section className="relative overflow-hidden rounded-[1.75rem] border border-blue-200/50 bg-[#071D48] p-4 text-white shadow-[0_22px_54px_rgba(8,31,84,0.22)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(51,182,255,0.34),transparent_34%),linear-gradient(135deg,rgba(37,99,255,0.42),transparent_58%)]" />
            <div className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-sky-300/20 blur-2xl" />

            <div className="relative flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-100/85">LinkCredit</p>
                <h2 className="mt-1 text-2xl font-black tracking-tight">{helperCreditBalanceLabel}</h2>
                <p className="mt-1 text-xs font-semibold leading-relaxed text-sky-50/78">{t('rewards.welcome_signup_purchase_note')}</p>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/12 ring-1 ring-white/18">
                <Coins className="h-6 w-6 text-amber-300" />
              </div>
            </div>

            <div className="relative mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/12">
                <p className="text-[10px] font-bold uppercase text-sky-100/70">Bônus</p>
                <p className="mt-1 text-lg font-black">+{SIGNUP_BONUS_LC.helper} LC</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/12">
                <p className="text-[10px] font-bold uppercase text-sky-100/70">Potencial</p>
                <p className="mt-1 text-lg font-black">{helperProjectedJobs}</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/12">
                <p className="text-[10px] font-bold uppercase text-sky-100/70">Média</p>
                <p className="mt-1 text-lg font-black">$85</p>
              </div>
            </div>

            <div className="relative mt-4 rounded-[1.35rem] bg-white/10 p-3 ring-1 ring-white/12">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="flex items-center gap-1.5 text-xs font-black">
                    <BarChart3 className="h-4 w-4 text-sky-200" />
                    Lucratividade ilustrativa
                  </p>
                  <p className="mt-0.5 text-[11px] font-semibold text-sky-50/68">Estimativa visual para futura integração com trabalhos concluídos.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCreditProjectionOpen((open) => !open)}
                  className="flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-white px-3 text-[11px] font-black text-blue-700 shadow-[0_10px_20px_rgba(37,99,255,0.18)]"
                  aria-expanded={creditProjectionOpen}
                >
                  {creditProjectionOpen ? 'Menos' : 'Expandir'}
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className={`flex items-end gap-2 transition-all duration-300 ${creditProjectionOpen ? 'h-36' : 'h-24'}`}>
                {helperCreditGraphBars.map((height, index) => (
                  <div key={index} className="flex flex-1 items-end rounded-full bg-white/8">
                    <div
                      className="w-full rounded-full bg-gradient-to-t from-[#2563FF] to-[#33B6FF] shadow-[0_0_18px_rgba(51,182,255,0.28)]"
                      style={{ height: `${height}%` }}
                    />
                  </div>
                ))}
              </div>

              {creditProjectionOpen ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-2xl bg-white/10 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase text-sky-100/65">Trabalhos estimados</p>
                    <p className="mt-1 text-lg font-black">{helperProjectedJobs}</p>
                  </div>
                  <Link
                    to={ROUTES.helperCredits}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-black text-blue-700"
                  >
                    Ver créditos
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ) : null}

              <div className="mt-3 flex items-center justify-between rounded-2xl bg-white/10 px-3 py-2">
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-sky-50/80">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-300" />
                  Projeção acumulada
                </span>
                <span className="text-sm font-black">${helperProjectedRevenue}</span>
              </div>
            </div>
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
              <p className="mb-3 text-xs font-medium text-slate-500">{t('helper_categories.compact_hint')}</p>
              <HelperCategoriesManager
                t={t}
                skillIds={helperSkillIds}
                primaryCategory={primaryCategory}
                secondaryCategories={secondaryCategories}
                onSkillsChange={setHelperSkillIds}
                onCategoriesChange={(primary, secondary) => {
                  setPrimaryCategory(primary);
                  setSecondaryCategories(secondary);
                }}
                onSaveAsync={persistHelperSkills}
              />
            </SettingsCard>

            <SettingsCard
              icon={<Briefcase className="h-5 w-5 text-cyan-600" />}
              title={t('app_pages.settings_helper_base_title')}
            >
              <div className="mb-4 space-y-2">
                <p className="text-xs font-medium leading-relaxed text-slate-500">
                  {t('app_pages.settings_helper_base_hint')}
                </p>
                {!baseConfigured ? (
                  <p className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-900">
                    {t('app_pages.settings_helper_base_setup_prompt')}
                  </p>
                ) : (
                  <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900">
                    {t('app_pages.settings_helper_base_configured')}
                  </p>
                )}
                {profile?.helper_base_change_unlocked_by_admin ? (
                  <p className="rounded-xl border border-violet-100 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-900">
                    {t('app_pages.settings_helper_base_admin_unlock')}
                  </p>
                ) : null}
                {baseConfigured && baseChangeStatus.reason === 'locked' ? (
                  <p className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
                    {t('app_pages.settings_helper_base_lock_message')}
                    <span className="mt-1 block font-bold">
                      {t('app_pages.settings_helper_base_lock_days', {
                        count: baseChangeStatus.daysUntilUnlock,
                      })}
                    </span>
                  </p>
                ) : null}
                {baseConfigured &&
                baseChangeStatus.allowed &&
                baseChangeStatus.reason === 'cooldown_elapsed' ? (
                  <p className="text-xs font-medium text-slate-500">
                    {t('app_pages.settings_helper_base_can_change_now')}
                  </p>
                ) : null}
              </div>
              <HelperBaseAddressInput
                value={helperBaseValue}
                onChange={setHelperBaseValue}
                disabled={baseFieldsLocked}
                locatingLabel={t('app_pages.settings_helper_base_locating')}
                currentLocationLabel={t('app_pages.settings_helper_base_use_location')}
                currentLocationShortLabel={t('app_pages.settings_helper_base_use_location_short')}
                placeholder={t('app_pages.settings_helper_base_address_placeholder')}
                cityLabel={t('app_pages.settings_helper_base_city')}
                provinceLabel={t('app_pages.settings_helper_base_province')}
                postalCodeLabel={t('app_pages.settings_helper_base_postal_code')}
              />
              <button
                type="button"
                disabled={
                  baseAddressSaving ||
                  !isConfigured ||
                  baseFieldsLocked ||
                  (!baseHasPendingChanges && baseConfigured)
                }
                onClick={() => void saveHelperBaseAddress()}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 text-sm font-black text-white hover:bg-cyan-700 disabled:opacity-50"
              >
                {baseAddressSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {t('app_pages.settings_helper_base_save')}
              </button>
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

        <SettingsCard icon={<Star className="h-5 w-5 text-slate-500" />} title={t('brand.about_title')}>
          <p className="text-sm font-medium leading-relaxed text-gray-600">{t('brand.about_body')}</p>
          <div className="mt-3 hidden md:block">
            <ByFluxBadge className="text-slate-400" />
          </div>
        </SettingsCard>

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
