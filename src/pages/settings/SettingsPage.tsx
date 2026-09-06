import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  Camera,
  GraduationCap,
  Info,
  Languages,
  Loader2,
  Lock,
  LogOut,
  MapPin,
  Shield,
  User,
} from 'lucide-react';
import { FilePickerLabel } from '@/components/common/HiddenFileInput';
import { UI_VISIBILITY } from '@/config/uiVisibility';
import { useLanguage } from '@/context/LanguageContext';
import { ROUTES } from '@/utils/constants';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { fileFromDataUrl, formatStorageError, uploadAvatarImage } from '@/lib/storageUpload';
import { logMediaPicker } from '@/utils/mediaPickerDebug';
import { cropSquareAvatarFromFile } from '@/utils/avatarMediaProcessing';
import { CityRegionAutocomplete } from '@/components/common/CityRegionAutocomplete';
import { ProfilePhoneField } from '@/components/profile/ProfilePhoneField';
import { SettingsSection } from '@/components/profile/SettingsSection';
import { PasskeySecurityPanel } from '@/components/auth/PasskeySecurityPanel';
import { profileInitials } from '@/components/profile/profileDisplay';
import type { QuebecPlace } from '@/data/quebecRegions';
import { parseStoredPhone, validatePhoneNumber } from '@/utils/phoneFormat';
import { useOnboardingRewards } from '@/hooks/useOnboardingRewards';
import { AppPageShell } from '@/components/design-system/AppPageShell';
import { DesktopBackButton } from '@/components/layout/DesktopBackButton';
import { ByFluxBadge } from '@/components/brand/ByFluxBadge';
import {
  HelperBaseAddressInput,
  helperBaseAddressFromProfile,
  type HelperBaseAddressValue,
} from '@/components/helper/HelperBaseAddressInput';
import {
  getHelperBaseChangeStatus,
  helperBaseFieldsChanged,
  helperBaseHasConfirmedCoordinates,
  helperBaseCooldownDaysRemaining,
  shouldBlockHelperBaseSaveDueToCooldown,
  shouldShowHelperBaseCooldownMessage,
  shouldShowHelperBaseTextNeedsGpsMessage,
} from '@/utils/helperBaseAddressLock';
import {
  HelperBaseAddressLockedError,
  syncHelperBaseAddress,
} from '@/services/supabase/helperBaseAddressRemote';
import { peekHelperApplyReturnContext, consumeHelperApplyReturnContext } from '@/utils/helperApplyReturnContext';
import { profileHasPersistedHomeCoordinates } from '@/utils/helperBaseAddressVerification';
import { helperBaseHasGpsConfirmation } from '@/components/helper/HelperBaseAddressInput';
import { PUSH_SUBSCRIPTIONS_TABLE } from '@/config/pushNotifications';
import { clearStoredAppMode } from '@/utils/appModeStorage';
import { extractErrorMessage, formatAuthFlowErrorMessage } from '@/utils/errorMessage';
import { APP_UI_LANGUAGES } from '@/data/spokenLanguages';

export default function SettingsPage() {
  const { t, language, setLanguage } = useLanguage();
  const { profile, updateProfile, signOut, session, isConfigured, refreshProfile } = useAuth();
  const { showToast } = useToast();
  useOnboardingRewards();
  const navigate = useNavigate();
  const location = useLocation();

  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [avatarSelectedFile, setAvatarSelectedFile] = useState<File | null>(null);
  const avatarObjectUrlRef = useRef<string | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState<string | null>(null);
  const [cityDisplay, setCityDisplay] = useState('');
  const [cityCanon, setCityCanon] = useState('');
  const [province, setProvince] = useState('');
  const [country, setCountry] = useState('');
  const [notifOn, setNotifOn] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [helperBaseValue, setHelperBaseValue] = useState<HelperBaseAddressValue>(() =>
    helperBaseAddressFromProfile({}),
  );
  const [initialLanguage, setInitialLanguage] = useState<'en' | 'pt' | 'fr'>(language);
  /** Prevents session/profile token refresh from wiping in-progress phone/address edits. */
  const hydratedProfileIdRef = useRef<string | null>(null);

  const isHelper = profile?.role === 'helper';

  useEffect(() => {
    if (!profile) {
      hydratedProfileIdRef.current = null;
      return;
    }
    // Hydrate once per account. Re-running on every `session`/`profile` reference churn
    // (TOKEN_REFRESHED, silent refreshProfile) was clearing phone + address mid-typing.
    if (hydratedProfileIdRef.current === profile.id) return;
    hydratedProfileIdRef.current = profile.id;

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
    setHelperBaseValue(helperBaseAddressFromProfile(profile));
    const preferred = profile.preferred_language;
    if (preferred === 'en' || preferred === 'pt' || preferred === 'fr') {
      setInitialLanguage(preferred);
    } else {
      setInitialLanguage(language);
    }
  }, [profile, session, language]);

  useEffect(() => {
    const hash = location.hash.replace(/^#/, '');
    if (hash === 'avatar' || hash === 'settings-avatar') {
      requestAnimationFrame(() =>
        document.getElementById('settings-avatar')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      );
      return;
    }
    if (hash === 'settings-account' || hash === 'account') {
      requestAnimationFrame(() =>
        document.getElementById('settings-account')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      );
      return;
    }
    if (hash === 'helper-base-location' || hash === 'helper-base') {
      requestAnimationFrame(() =>
        document.getElementById('helper-base-location')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      );
    }
  }, [location.hash, location.pathname]);

  const goBackFromSettings = () => {
    const from = (location.state as { from?: string } | null)?.from;
    if (from === ROUTES.profile) {
      navigate(ROUTES.profile);
      return;
    }
    navigate(-1);
  };
  const desktopBackTo =
    (location.state as { from?: string } | null)?.from === ROUTES.profile
      ? ROUTES.profile
      : undefined;
  const avatarDisplay = avatarPreviewUrl ?? profile?.avatar_url?.trim() ?? null;

  const revokeAvatarObjectUrl = () => {
    if (avatarObjectUrlRef.current) {
      URL.revokeObjectURL(avatarObjectUrlRef.current);
      avatarObjectUrlRef.current = null;
    }
    setAvatarPreviewUrl(null);
  };

  useEffect(() => () => revokeAvatarObjectUrl(), []);

  const authEmail = session?.user?.email?.trim() ?? '';
  const isOAuthUser = Boolean(
    session?.user?.app_metadata?.provider === 'google' ||
      (session?.user?.app_metadata?.providers as string[] | undefined)?.includes('google'),
  );

  const addressUpdatedAt = profile?.address_updated_at ? new Date(profile.address_updated_at) : null;
  const now = new Date();
  const addressLockDaysRemaining = addressUpdatedAt
    ? Math.ceil(30 - (now.getTime() - addressUpdatedAt.getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const addressLocked = addressLockDaysRemaining > 0;

  const baseChangeStatus = useMemo(() => getHelperBaseChangeStatus(profile), [profile]);
  const baseNeedsGpsConfirmation = useMemo(
    () => shouldShowHelperBaseTextNeedsGpsMessage(profile),
    [profile],
  );
  const baseShowCooldownMessage = useMemo(
    () => shouldShowHelperBaseCooldownMessage(profile, baseChangeStatus),
    [profile, baseChangeStatus],
  );
  const baseFieldsLocked = baseShowCooldownMessage;
  const pendingApplyContext = isHelper ? peekHelperApplyReturnContext() : null;
  const emphasizeGpsForPendingApply = Boolean(
    pendingApplyContext &&
      (!helperBaseHasGpsConfirmation(helperBaseValue) ||
        baseNeedsGpsConfirmation ||
        !helperBaseHasConfirmedCoordinates(profile)),
  );
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

  const deleteConfirmKeyword = useMemo(
    () => t('app_pages.settings_delete_account_confirm_keyword').trim().toUpperCase(),
    [t, language],
  );

  const accountDirty = useMemo(() => {
    if (!profile) return Boolean(avatarSelectedFile);
    const newCity = (cityCanon.trim() || cityDisplay.trim()) || null;
    const nameChanged = (name.trim() || null) !== (profile.name?.trim() || null);
    const phoneChanged = (phone?.trim() || null) !== (profile.phone?.trim() || null);
    const cityChanged = !isHelper && newCity !== (profile.city ?? null);
    const regionChanged = !isHelper && (province.trim() || null) !== (profile.region ?? null);
    const langChanged = language !== (profile.preferred_language || initialLanguage);
    return Boolean(
      avatarSelectedFile ||
        nameChanged ||
        phoneChanged ||
        cityChanged ||
        regionChanged ||
        langChanged ||
        (isHelper && baseHasPendingChanges),
    );
  }, [
    profile,
    avatarSelectedFile,
    name,
    phone,
    cityCanon,
    cityDisplay,
    province,
    isHelper,
    language,
    initialLanguage,
    baseHasPendingChanges,
  ]);

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

  const saveAll = async () => {
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

    const newCity = (cityCanon.trim() || cityDisplay.trim()) || null;
    const addressChanged = !isHelper && newCity !== (profile.city ?? null);
    if (!isHelper && addressLocked && addressChanged) {
      showToast(t('app_pages.settings_address_lock', { count: String(addressLockDaysRemaining) }), 'error');
      return;
    }

    if (shouldBlockHelperBaseSaveDueToCooldown(profile, baseChangeStatus, baseHasPendingChanges)) {
      showToast(t('app_pages.settings_helper_base_lock_message'), 'error');
      return;
    }

    setSaving(true);
    try {
      if (avatarSelectedFile && session?.user?.id) {
        let uploadFile: File = avatarSelectedFile;
        try {
          const cropped = await cropSquareAvatarFromFile(avatarSelectedFile);
          uploadFile = await fileFromDataUrl(cropped, 'avatar.jpg', 'image/jpeg');
        } catch {
          logMediaPicker('CROP FALLBACK — uploading original file');
        }
        const { publicUrl } = await uploadAvatarImage(session.user.id, uploadFile);
        const avatarErr = await updateProfile({ avatar_url: publicUrl });
        if (avatarErr) {
          showToast(formatAuthFlowErrorMessage(t, avatarErr), 'error');
          return;
        }
        revokeAvatarObjectUrl();
        setAvatarSelectedFile(null);
      }

      let syncedBaseProfile: Awaited<ReturnType<typeof syncHelperBaseAddress>> | null = null;
      if (isHelper && baseHasPendingChanges) {
        if (!helperBaseValue.address.trim() && !helperBaseValue.city.trim()) {
          showToast(t('app_pages.settings_helper_base_required'), 'error');
          return;
        }
        syncedBaseProfile = await syncHelperBaseAddress({
          address: helperBaseValue.address.trim() || null,
          city: helperBaseValue.city.trim() || null,
          province: helperBaseValue.province.trim() || null,
          postalCode: helperBaseValue.postalCode.trim() || null,
          lat: helperBaseValue.latitude,
          lng: helperBaseValue.longitude,
        });
      }

      const base: Parameters<typeof updateProfile>[0] = {
        name: name.trim() || null,
        phone: phone?.trim() ? phone.trim() : null,
        preferred_language: language,
        ...(!isHelper
          ? {
              city: newCity,
              region: province.trim() || null,
              country: country.trim() || null,
              ...(addressChanged && newCity ? { address_updated_at: new Date().toISOString() } : {}),
            }
          : {}),
      };
      const err = await updateProfile(base);
      if (err) {
        showToast(formatAuthFlowErrorMessage(t, err), 'error');
        return;
      }

      const refreshed = await refreshProfile();
      const effectiveProfile = refreshed ?? syncedBaseProfile ?? profile;
      if (effectiveProfile && isHelper) {
        setHelperBaseValue(helperBaseAddressFromProfile(effectiveProfile));
      }
      setInitialLanguage(language);

      const pendingApply = peekHelperApplyReturnContext();
      const hasPersistedCoords =
        isHelper && profileHasPersistedHomeCoordinates(effectiveProfile);

      if (isHelper && pendingApply) {
        if (hasPersistedCoords) {
          consumeHelperApplyReturnContext();
          showToast(t('app_pages.settings_helper_base_saved_returning'), 'success');
          navigate(pendingApply.returnPath || ROUTES.helperDashboard, {
            state: {
              openJobId: pendingApply.jobId,
              resumeApply: true,
              resumeApplicationType: pendingApply.applicationType,
            },
          });
          return;
        }
        showToast(t('app_pages.settings_helper_base_saved_need_gps'), 'info');
        return;
      }

      showToast(t('app_pages.settings_saved'), 'success');
    } catch (e) {
      if (e instanceof HelperBaseAddressLockedError) {
        showToast(t('app_pages.settings_helper_base_lock_message'), 'error');
      } else {
        const raw = formatStorageError(e);
        showToast(
          raw && raw !== 'NO_SUPABASE'
            ? raw
            : extractErrorMessage(e, t('app_pages.settings_helper_base_save_error')),
          'error',
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
    await signOut();
    showToast(t('nav.toast_logout'), 'success');
    navigate(ROUTES.home, { replace: true });
  };

  const deleteAccount = async () => {
    if (!isConfigured || !profile || !session?.user?.id) return;
    const userId = session.user.id;
    setDeleting(true);
    try {
      const deletedAt = new Date().toISOString();
      const profileErr = await updateProfile({
        name: null,
        bio: null,
        phone: null,
        city: null,
        region: null,
        country: null,
        avatar_url: null,
        spoken_languages: [],
        deleted_at: deletedAt,
      });
      if (profileErr) {
        showToast(formatAuthFlowErrorMessage(t, profileErr), 'error');
        return;
      }

      const { getSupabase } = await import('@/lib/supabase');
      const sb = getSupabase();
      if (sb) {
        await sb.from('notifications').delete().eq('user_id', userId);
        await sb.from(PUSH_SUBSCRIPTIONS_TABLE).delete().eq('user_id', userId);
        await sb.auth.updateUser({
          data: {
            user_type: '',
            accepted_terms: false,
            accepted_terms_at: '',
            helper_terms_accepted: false,
            helper_terms_accepted_at: '',
          },
        });
      }

      clearStoredAppMode(userId);
      showToast(t('app_pages.settings_delete_account_success'), 'success');
      await signOut();
      navigate(ROUTES.home, { replace: true });
    } catch {
      showToast(t('app_pages.settings_delete_account_error'), 'error');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const roleLabel = isHelper
    ? t('app_pages.settings_mode_helper')
    : t('app_pages.settings_mode_client');
  const headerCity = isHelper
    ? helperBaseValue.city || profile?.helper_base_city || profile?.city
    : cityDisplay || profile?.city;

  return (
    <AppPageShell className="min-h-[calc(100dvh-64px)]">
      <div className="mx-auto max-w-lg space-y-4 pb-28">
        <DesktopBackButton to={desktopBackTo} />
        <button
          type="button"
          onClick={goBackFromSettings}
          className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-500 transition-colors hover:text-slate-900 lg:hidden"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('nav.back')}
        </button>

        <header id="settings-avatar" className="rounded-[1.5rem] border border-slate-200/90 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.045)]">
          <div className="flex items-center gap-3.5">
            <FilePickerLabel
              accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              disabled={!isConfigured || saving}
              onFiles={onAvatarFile}
              className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-slate-100 bg-slate-100"
            >
              {avatarDisplay ? (
                <img src={avatarDisplay} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-lg font-black text-slate-400">
                  {profileInitials(name, authEmail)}
                </div>
              )}
              <span className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-[#2563FF] text-white ring-2 ring-white">
                <Camera className="h-3 w-3" aria-hidden />
              </span>
            </FilePickerLabel>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl font-black tracking-tight text-slate-950">
                {name.trim() || t('app_pages.settings_title')}
              </h1>
              <p className="mt-0.5 text-sm font-semibold text-slate-500">{roleLabel}</p>
              {headerCity ? (
                <p className="mt-1 flex min-w-0 items-center gap-1 text-xs font-medium text-slate-400">
                  <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="truncate">{headerCity}</span>
                </p>
              ) : null}
            </div>
          </div>
          <p className="mt-3 text-xs font-medium text-slate-500">{t('app_pages.settings_sub')}</p>
        </header>

        <SettingsSection
          id="settings-account"
          icon={<User className="h-5 w-5 text-blue-600" />}
          title={t('app_pages.settings_account')}
        >
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-slate-700">
              {t('app_pages.settings_name')}
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              />
            </label>

            {authEmail ? (
              <div>
                <p className="mb-1 text-sm font-semibold text-slate-700">{t('app_pages.settings_email')}</p>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <span className="flex-1 truncate text-sm text-slate-700">{authEmail}</span>
                  <span className="rounded-md bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                    {isOAuthUser ? 'Google' : 'Email'}
                  </span>
                </div>
                {isOAuthUser ? (
                  <p className="mt-1 text-[11px] text-slate-400">{t('app_pages.settings_email_oauth_hint')}</p>
                ) : null}
              </div>
            ) : null}

            <ProfilePhoneField
              label={t('app_pages.settings_phone')}
              value={phone}
              onChange={setPhone}
              disabled={!isConfigured || saving}
              t={t}
            />
          </div>
        </SettingsSection>

        <SettingsSection
          icon={<MapPin className="h-5 w-5 text-emerald-600" />}
          title={t('app_pages.settings_address_section')}
        >
          {isHelper ? (
            <div id="helper-base-location">
              <p className="mb-3 text-[11px] text-slate-400">{t('app_pages.settings_helper_base_hint')}</p>
              {helperBaseValue.latitude == null || helperBaseValue.longitude == null ? (
                <p className="mb-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
                  {t('helper_dashboard.apply_in_person_coords_required')}
                </p>
              ) : null}
              {baseNeedsGpsConfirmation ? (
                <p
                  data-testid="helper-base-text-needs-gps"
                  className="mb-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-900"
                >
                  {t('app_pages.settings_helper_base_text_needs_gps')}
                </p>
              ) : null}
              {profile?.helper_base_change_unlocked_by_admin ? (
                <p className="mb-3 rounded-xl border border-violet-100 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-900">
                  {t('app_pages.settings_helper_base_admin_unlock')}
                </p>
              ) : null}
              {baseShowCooldownMessage ? (
                <p className="mb-3 flex gap-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
                  <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span>
                    {t('app_pages.settings_helper_base_lock_message')}
                    <span className="mt-1 block font-bold">
                      {t('app_pages.settings_helper_base_lock_days', {
                        count: helperBaseCooldownDaysRemaining(baseChangeStatus),
                      })}
                    </span>
                  </span>
                </p>
              ) : null}
              <HelperBaseAddressInput
                value={helperBaseValue}
                onChange={setHelperBaseValue}
                disabled={baseFieldsLocked || !isConfigured}
                locatingLabel={t('app_pages.settings_helper_base_locating')}
                currentLocationLabel={t('app_pages.settings_helper_base_use_location')}
                currentLocationShortLabel={t('app_pages.settings_helper_base_use_location_short')}
                placeholder={t('app_pages.settings_helper_base_address_placeholder')}
                cityLabel={t('app_pages.settings_helper_base_city')}
                provinceLabel={t('app_pages.settings_helper_base_province')}
                postalCodeLabel={t('app_pages.settings_helper_base_postal_code')}
                mapsUnavailableMessage={t('app_pages.settings_google_maps_unavailable')}
                gpsHomeWarning={t('app_pages.settings_helper_base_gps_home_warning')}
                gpsStatusPendingLabel={t('app_pages.settings_helper_base_gps_status_pending')}
                gpsStatusConfirmedLabel={t('app_pages.settings_helper_base_gps_status_confirmed')}
                emphasizeGpsButton={emphasizeGpsForPendingApply || baseNeedsGpsConfirmation}
                onLocationError={(reason) =>
                  showToast(
                    reason === 'denied'
                      ? t('app_pages.settings_location_denied')
                      : t('app_pages.settings_location_unavailable'),
                    'error',
                  )
                }
                onLocationSuccess={() => showToast(t('app_pages.settings_helper_base_gps_success'), 'success')}
              />
            </div>
          ) : (
            <div>
              <CityRegionAutocomplete
                label={t('app_pages.settings_city')}
                value={cityDisplay}
                onChangeText={(text) => {
                  if (addressLocked) return;
                  setCityDisplay(text);
                  setCityCanon('');
                  setProvince('');
                  setCountry('');
                }}
                onPickPlace={(p: QuebecPlace) => {
                  if (addressLocked) return;
                  setCityDisplay(p.label);
                  setCityCanon(p.city);
                  setProvince(p.region);
                  setCountry(p.country);
                }}
                disabled={!isConfigured || addressLocked}
                placeholder={t('profile_form.city_placeholder')}
              />
              {addressLocked ? (
                <p className="mt-2 flex gap-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-700">
                  <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  {t('app_pages.settings_address_lock', { count: String(addressLockDaysRemaining) })}
                </p>
              ) : null}
            </div>
          )}
        </SettingsSection>

        <SettingsSection
          icon={<Languages className="h-5 w-5 text-violet-600" />}
          title={t('app_pages.settings_preferences')}
        >
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-slate-700">
              {t('app_pages.settings_lang')}
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'en' | 'pt' | 'fr')}
                className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              >
                {APP_UI_LANGUAGES.map((option) => (
                  <option key={option.code} value={option.code}>
                    {t(option.labelKey)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
              <input
                type="checkbox"
                checked={notifOn}
                onChange={(e) => setNotifOn(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-800">
                <Bell className="h-4 w-4 text-amber-500" aria-hidden />
                {t('app_pages.settings_notif')}
              </span>
            </label>
          </div>
        </SettingsSection>

        <SettingsSection
          icon={<Shield className="h-5 w-5 text-slate-600" />}
          title={t('app_pages.settings_security')}
          description={t('profile_form.phone_privacy_hint')}
        >
          <div className="space-y-3">
            <PasskeySecurityPanel />
            <Link
              to={ROUTES.profilePublicEdit}
              className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 transition hover:bg-white"
            >
              {t('profile_page.edit_public')}
            </Link>
          </div>
        </SettingsSection>

        {isHelper && UI_VISIBILITY.training ? (
          <Link
            to={ROUTES.helperTraining}
            className="block rounded-[1.5rem] border border-indigo-100 bg-white p-5 shadow-sm transition-all hover:border-indigo-200 hover:shadow-md"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-black text-slate-900">{t('training.page_title')}</h2>
                <p className="mt-1 text-sm font-medium text-slate-500">{t('training.settings_teaser')}</p>
              </div>
            </div>
          </Link>
        ) : null}

        <SettingsSection icon={<Info className="h-5 w-5 text-slate-500" />} title={t('brand.about_title')}>
          <p className="text-sm font-medium leading-relaxed text-slate-600">{t('brand.about_body')}</p>
          <div className="mt-3 hidden md:block">
            <ByFluxBadge className="text-slate-400" />
          </div>
        </SettingsSection>

        <button
          type="button"
          onClick={() => void logout()}
          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
        >
          <LogOut className="h-4 w-4" />
          {t('app_pages.settings_logout')}
        </button>

        <button
          type="button"
          onClick={() => {
            setDeleteConfirmText('');
            setShowDeleteModal(true);
          }}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-red-100 bg-transparent px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50"
        >
          {t('app_pages.settings_delete_account')}
        </button>
      </div>

      {accountDirty ? (
        <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] z-30 px-3 md:bottom-6">
          <div className="mx-auto max-w-lg">
            <button
              type="button"
              disabled={saving || !isConfigured}
              onClick={() => void saveAll()}
              className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-[#2563FF] px-6 text-sm font-black text-white shadow-[0_14px_36px_rgba(37,99,255,0.35)] hover:bg-[#1D4ED8] disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {t('app_pages.settings_save')}
            </button>
          </div>
        </div>
      ) : null}

      {showDeleteModal ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div
            className="w-full max-w-sm overflow-y-auto rounded-[1.75rem] bg-white p-6 shadow-[0_32px_80px_rgba(0,0,0,0.28)]"
            style={{ maxHeight: 'calc(100dvh - 2rem)' }}
          >
            <h2 className="text-lg font-black text-slate-900">
              {t('app_pages.settings_delete_account_confirm_title')}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              {t('app_pages.settings_delete_account_confirm_body')}
            </p>
            <div className="mt-4">
              <p className="mb-1.5 text-sm font-semibold text-slate-700">
                {t('app_pages.settings_delete_account_type_hint')}
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={t('app_pages.settings_delete_account_confirm_keyword')}
                autoCapitalize="characters"
                className="block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold tracking-widest"
              />
            </div>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                disabled={deleteConfirmText.trim().toUpperCase() !== deleteConfirmKeyword || deleting}
                onClick={() => void deleteAccount()}
                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-black text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                {deleting
                  ? t('app_pages.settings_delete_account_deleting')
                  : t('app_pages.settings_delete_account_confirm_btn')}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex min-h-[44px] w-full items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppPageShell>
  );
}
