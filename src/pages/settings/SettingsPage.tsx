import { useEffect, useRef, useState } from 'react';
import { FilePickerLabel } from '@/components/common/HiddenFileInput';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { GraduationCap, Settings, Bell, Shield, User, Loader2, Camera } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { ROUTES } from '@/utils/constants';
import { useAuth } from '@/context/AuthContext';
import { useAppMode } from '@/context/AppModeContext';
import { useModeSwitch } from '@/hooks/useModeSwitch';
import { useToast } from '@/context/ToastContext';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { fileFromDataUrl, formatStorageError, uploadAvatarImage } from '@/lib/storageUpload';
import { logMediaPicker } from '@/utils/mediaPickerDebug';
import { cropSquareAvatarFromFile } from '@/utils/portfolioMediaProcessing';
import { CityRegionAutocomplete } from '@/components/common/CityRegionAutocomplete';
import { ProfilePhoneField } from '@/components/profile/ProfilePhoneField';
import type { QuebecPlace } from '@/data/quebecRegions';
import { parseStoredPhone, validatePhoneNumber } from '@/utils/phoneFormat';
import { ProfileRewardsProgress } from '@/components/rewards/ProfileRewardsProgress';
import { useOnboardingRewards } from '@/hooks/useOnboardingRewards';
import { fetchHelperSkills } from '@/services/supabase/helperSkillsRemote';
import { formatLinkCredits } from '@/utils/formatLinkCredits';
import { SIGNUP_BONUS_LC } from '@/config/onboardingRewards';

export default function SettingsPage() {
  const { t, language, setLanguage } = useLanguage();
  const { profile, updateProfile, signOut, session, isConfigured, refreshProfile } = useAuth();
  const { mode } = useAppMode();
  const { toClient, toHelper, modeSwitchBusy } = useModeSwitch();
  const { showToast } = useToast();
  const { evaluateProfileRewards } = useOnboardingRewards();
  const [helperSkillCount, setHelperSkillCount] = useState(0);
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
  const [notifOn, setNotifOn] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const meta = (session?.user?.user_metadata ?? {}) as Record<string, unknown>;
    const metaName = typeof meta.full_name === 'string' ? meta.full_name : typeof meta.name === 'string' ? meta.name : '';
    setName(profile.name?.trim() || metaName || '');
    setPhone(profile.phone ?? null);
    const c = profile.city ?? '';
    setCityDisplay(c);
    setCityCanon(c);
    setProvince(profile.region ?? '');
    setCountry(profile.country ?? '');
    setBio(profile.bio ?? '');
  }, [profile, session]);

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
    if (!session?.user?.id || profile?.role !== 'helper' || !isConfigured) {
      setHelperSkillCount(0);
      return;
    }
    void fetchHelperSkills(session.user.id).then((keys) => setHelperSkillCount(keys.length));
  }, [session?.user?.id, profile?.role, isConfigured]);

  const authEmail = session?.user?.email?.trim() ?? '';
  const signupBonusLc =
    profile?.role === 'helper' ? SIGNUP_BONUS_LC.helper : SIGNUP_BONUS_LC.client;

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
    const err = await updateProfile({
      name: name.trim() || null,
      phone: phone?.trim() ? phone.trim() : null,
      city: (cityCanon.trim() || cityDisplay.trim()) || null,
      region: province.trim() || null,
      country: country.trim() || null,
      bio: bio.trim() || null,
    });
    setSaving(false);
    if (err) showToast(t(err.messageKey, err.vars), 'error');
    else {
      showToast(t('app_pages.settings_saved'), 'success');
      void evaluateProfileRewards({
        avatarUrl: profile?.avatar_url,
        bio: bio.trim() || null,
        phone: phone?.trim() ? phone.trim() : null,
        skillCount: helperSkillCount,
      });
    }
  };

  const sendPasswordReset = async () => {
    const em = authEmail;
    if (!em || !isSupabaseConfigured()) return;
    setPwBusy(true);
    const sb = getSupabase();
    if (!sb) {
      setPwBusy(false);
      return;
    }
    const { error } = await sb.auth.resetPasswordForEmail(em, {
      redirectTo: `${window.location.origin}${ROUTES.login}`,
    });
    setPwBusy(false);
    if (error) showToast(error.message, 'error');
    else showToast(t('app_pages.settings_toast_reset'), 'success');
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
    console.log('[media-picker] SET_SELECTED_FILE', f.name);
    revokeAvatarObjectUrl();
    const preview = URL.createObjectURL(f);
    avatarObjectUrlRef.current = preview;
    setAvatarSelectedFile(f);
    setAvatarPreviewUrl(preview);
    logMediaPicker('PREVIEW CREATED', preview);
  };

  const saveAvatar = async () => {
    if (!avatarSelectedFile || !isConfigured || !session?.user?.id) return;
    logMediaPicker('SAVE CLICKED');
    setAvatarSaving(true);
    try {
      let uploadFile: File = avatarSelectedFile;
      try {
        const cropped = await cropSquareAvatarFromFile(avatarSelectedFile);
        uploadFile = await fileFromDataUrl(cropped, 'avatar.jpg', 'image/jpeg');
      } catch {
        logMediaPicker('CROP FALLBACK — uploading original file');
      }
      logMediaPicker('UPLOAD START');
      const { publicUrl } = await uploadAvatarImage(session.user.id, uploadFile);
      logMediaPicker('UPLOAD SUCCESS', publicUrl);
      const err = await updateProfile({ avatar_url: publicUrl });
      if (err) {
        showToast(t(err.messageKey, err.vars), 'error');
        return;
      }
      await refreshProfile();
      logMediaPicker('PROFILE UPDATED', publicUrl);
      revokeAvatarObjectUrl();
      setAvatarSelectedFile(null);
      showToast(t('app_pages.settings_avatar_saved'), 'success');
      void evaluateProfileRewards({
        avatarUrl: publicUrl,
        bio: bio.trim() || null,
        phone: phone?.trim() ? phone.trim() : null,
        skillCount: helperSkillCount,
      });
    } catch (e) {
      const raw = formatStorageError(e);
      showToast(raw && raw !== 'NO_SUPABASE' ? raw : t('profile_setup.avatar_save_error'), 'error');
    } finally {
      setAvatarSaving(false);
    }
  };

  return (
    <div className="bg-[#f0f2f5] min-h-[calc(100vh-64px)] py-8 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center sm:text-left">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm border border-gray-100 mb-4">
            <Settings className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">{t('app_pages.settings_title')}</h1>
          <p className="text-gray-500 font-medium mt-2 text-sm max-w-xl">{t('app_pages.settings_sub')}</p>
          {isConfigured && profile ? (
            <p className="mt-3 text-sm font-semibold text-blue-700">
              {t('rewards.signup_balance', {
                amount: formatLinkCredits(profile.credits ?? signupBonusLc, language),
              })}
            </p>
          ) : null}
        </div>

        {isConfigured && profile ? (
          <ProfileRewardsProgress skillCount={helperSkillCount} />
        ) : null}

        <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-black text-gray-900">{t('app_pages.settings_account')}</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-gray-700">
              {t('app_pages.settings_name')}
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
              />
            </label>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t('app_pages.settings_email')}</label>
              <input
                type="email"
                readOnly
                disabled
                value={authEmail}
                className="mt-1 block w-full rounded-xl border border-gray-200 bg-gray-100 px-3 py-2.5 text-sm text-gray-600 cursor-not-allowed"
                placeholder={authEmail ? undefined : t('profile_form.email_empty')}
              />
              <p className="mt-1 text-xs text-gray-500">{t('profile_form.email_readonly_hint')}</p>
            </div>
            <div className="sm:col-span-2">
              <ProfilePhoneField
                label={t('app_pages.settings_phone')}
                value={phone}
                onChange={setPhone}
                disabled={!isConfigured || saving}
                t={t}
              />
            </div>
            <div className="sm:col-span-2">
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
          </div>
        </section>

        <section id="settings-avatar" className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Camera className="w-5 h-5 text-violet-600" />
            <h2 className="text-lg font-black text-gray-900">{t('app_pages.settings_avatar_title')}</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">{t('app_pages.settings_avatar_hint')}</p>
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div className="relative shrink-0">
              <FilePickerLabel
                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                disabled={!isConfigured || avatarSaving}
                onFiles={onAvatarFile}
                className="h-28 w-28 rounded-full overflow-hidden border-4 border-gray-100 bg-gray-100 shadow-inner"
              >
                {avatarDisplay ? (
                  <img src={avatarDisplay} alt="" className="h-full w-full object-cover pointer-events-none" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-gray-400 pointer-events-none">
                    <User className="w-12 h-12" />
                  </div>
                )}
                {avatarSaving ? (
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                  </div>
                ) : null}
              </FilePickerLabel>
            </div>
            <div className="flex-1 min-w-0 space-y-3">
              {avatarSelectedFile ? (
                <p className="text-xs font-semibold text-gray-600 truncate" title={avatarSelectedFile.name}>
                  {avatarSelectedFile.name}
                </p>
              ) : null}
              <FilePickerLabel
                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                disabled={!isConfigured || avatarSaving}
                onFiles={onAvatarFile}
                className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-800 hover:bg-gray-50 min-h-[44px]"
              >
                {t('app_pages.settings_avatar_choose')}
              </FilePickerLabel>
              <button
                type="button"
                disabled={!avatarSelectedFile || avatarSaving || !isConfigured}
                onClick={() => void saveAvatar()}
                className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50 min-h-[44px]"
              >
                {avatarSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {t('app_pages.settings_avatar_save')}
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-black text-gray-900">{t('app_pages.settings_preferences')}</h2>
          </div>
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-gray-700">
              {t('app_pages.settings_lang')}
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'en' | 'pt' | 'fr')}
                className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
              >
                <option value="en">English</option>
                <option value="pt">Português</option>
                <option value="fr">Français</option>
              </select>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={notifOn} onChange={(e) => setNotifOn(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
              <span className="text-sm font-medium text-gray-800">{t('app_pages.settings_notif')}</span>
            </label>
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">{t('app_pages.settings_mode')}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void toClient()}
                  disabled={modeSwitchBusy}
                  className={`flex-1 rounded-xl border px-3 py-2 text-sm font-bold ${mode === 'client' ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-gray-200 bg-gray-50 text-gray-700'}`}
                >
                  {t('app_pages.settings_mode_client')}
                </button>
                <button
                  type="button"
                  onClick={() => void toHelper()}
                  disabled={modeSwitchBusy}
                  className={`flex-1 rounded-xl border px-3 py-2 text-sm font-bold ${mode === 'helper' ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-gray-200 bg-gray-50 text-gray-700'}`}
                >
                  {t('app_pages.settings_mode_helper')}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-black text-gray-900">{t('app_pages.settings_security')}</h2>
          </div>
          <p className="text-sm text-gray-600 mb-3">{t('app_pages.settings_password_hint')}</p>
          <button
            type="button"
            disabled={pwBusy || !isConfigured}
            onClick={() => void sendPasswordReset()}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-black disabled:opacity-50"
          >
            {pwBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t('app_pages.settings_password_btn')}
          </button>
          <button
            type="button"
            onClick={() => void logout()}
            className="mt-3 block w-full sm:w-auto rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-100"
          >
            {t('app_pages.settings_logout')}
          </button>
        </section>

        <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-violet-600" />
            <h2 className="text-lg font-black text-gray-900">{t('app_pages.settings_profile')}</h2>
          </div>
          <label className="block text-sm font-semibold text-gray-700">
            {t('app_pages.settings_bio')}
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
            />
          </label>
          <p className="mt-2 text-xs text-gray-500">{t('app_pages.settings_skills_hint')}</p>
        </section>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between sm:items-center">
          <Link
            to={ROUTES.home}
            className="inline-flex justify-center rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-800 hover:bg-gray-50"
          >
            {t('app_pages.back_home')}
          </Link>
          <button
            type="button"
            disabled={saving || !isConfigured}
            onClick={() => void saveAccount()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t('app_pages.settings_save')}
          </button>
        </div>

        <Link
          to={ROUTES.helperTraining}
          className="block rounded-3xl border border-indigo-100 bg-white p-6 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all group"
        >
          <div className="flex items-start gap-4">
            <div className="shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-black text-gray-900 group-hover:text-indigo-700">{t('training.page_title')}</h2>
              <p className="text-sm text-gray-500 font-medium mt-1">{t('training.settings_teaser')}</p>
              <span className="inline-flex mt-3 text-sm font-black text-indigo-600">{t('training.membership_link')} →</span>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
