import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Loader2, MapPin } from 'lucide-react';
import { AppPageShell } from '@/components/design-system/AppPageShell';
import { DesktopBackButton } from '@/components/layout/DesktopBackButton';
import { useAuth } from '@/context/AuthContext';
import { useAppMode } from '@/context/AppModeContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import {
  getSpokenLanguageLabel,
  isPublicProfileSpokenLanguageCode,
  mergeSpokenLanguagesForSave,
  PUBLIC_PROFILE_SPOKEN_LANGUAGES,
} from '@/data/spokenLanguages';
import { SERVICE_CATEGORIES, type ServiceCategoryId, isOfficialServiceCategoryId } from '@/data/serviceCategories';
import { translateCategory } from '@/utils/translateCategory';
import { extractErrorMessage, formatAuthFlowErrorMessage } from '@/utils/errorMessage';
import { ROUTES } from '@/utils/constants';
import { profileInitials } from '@/components/profile/profileDisplay';

export default function PublicProfileEditPage() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { profile, session, updateProfile, refreshProfile, isConfigured } = useAuth();
  const { isHelperMode } = useAppMode();
  const { showToast } = useToast();
  const isHelper = profile?.role === 'helper' || isHelperMode;

  const [bio, setBio] = useState('');
  const [spokenLanguages, setSpokenLanguages] = useState<string[]>([]);
  const [primaryCategory, setPrimaryCategory] = useState<ServiceCategoryId>('cleaning');
  const [saving, setSaving] = useState(false);

  const displayName = profile?.name?.trim() || session?.user.email || 'LinkHelp';
  const avatarUrl = profile?.avatar_url?.trim() || '';
  const city = isHelper ? profile?.helper_base_city ?? profile?.city : profile?.city;
  const region = isHelper ? profile?.helper_base_province ?? profile?.region : profile?.region;
  const locationLabel = [city, region].filter(Boolean).join(', ');
  const storedLanguages = useMemo(
    () => (Array.isArray(profile?.spoken_languages) ? profile.spoken_languages.filter(Boolean) : []),
    [profile?.spoken_languages],
  );

  useEffect(() => {
    if (!profile) return;
    setBio(profile.bio?.trim() ?? '');
    const fromProfile = storedLanguages.filter(isPublicProfileSpokenLanguageCode);
    setSpokenLanguages(
      fromProfile.length
        ? fromProfile
        : profile.preferred_language && isPublicProfileSpokenLanguageCode(profile.preferred_language)
          ? [profile.preferred_language]
          : isPublicProfileSpokenLanguageCode(language)
            ? [language]
            : ['en'],
    );
    if (isOfficialServiceCategoryId(profile.primary_category)) {
      setPrimaryCategory(profile.primary_category);
    }
  }, [profile, language, storedLanguages]);

  const toggleLanguage = (code: string) => {
    setSpokenLanguages((prev) =>
      prev.includes(code) ? prev.filter((id) => id !== code) : [...prev, code],
    );
  };

  const savePublicProfile = async () => {
    if (!isConfigured || !profile) {
      showToast(t('app_pages.settings_saved'), 'info');
      return;
    }
    setSaving(true);
    try {
      const nextLanguages = mergeSpokenLanguagesForSave(spokenLanguages, storedLanguages);
      const payload = isHelper
        ? {
            bio: bio.trim() || null,
            spoken_languages: nextLanguages.length ? nextLanguages : [language],
            primary_category: primaryCategory,
          }
        : {
            bio: bio.trim() || null,
            spoken_languages: nextLanguages.length ? nextLanguages : [language],
          };
      const err = await updateProfile(payload);
      if (err) {
        showToast(formatAuthFlowErrorMessage(t, err), 'error');
        return;
      }
      await refreshProfile();
      showToast(t('app_pages.settings_saved'), 'success');
    } catch (e) {
      showToast(extractErrorMessage(e, t('helper_categories.save_error')), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppPageShell className="w-full">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4 px-1 pb-28 md:pb-10">
        <DesktopBackButton />
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-900 lg:hidden"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('nav.back')}
        </button>

        <header>
          <h1 className="text-2xl font-black tracking-tight text-slate-950">
            {t('profile_page.public_edit_title')}
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500">{t('profile_page.public_edit_sub')}</p>
        </header>

        <section className="rounded-[1.25rem] border border-slate-200/90 bg-white p-4 shadow-sm">
          <p className="text-sm font-bold text-slate-800">{t('app_pages.settings_avatar_choose')}</p>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 ring-2 ring-slate-200">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-sm font-black text-slate-500">{profileInitials(displayName)}</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => navigate(`${ROUTES.settings}#avatar`)}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 transition hover:bg-white"
            >
              <Camera className="h-4 w-4" aria-hidden />
              {t('app_pages.settings_avatar_choose')}
            </button>
          </div>
        </section>

        <section className="rounded-[1.25rem] border border-slate-200/90 bg-white p-4 shadow-sm">
          <label className="block text-sm font-bold text-slate-800">
            {t('profile_page.bio_label')}
            <textarea
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={t('profile_page.bio_placeholder')}
              className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </label>
        </section>

        <section className="rounded-[1.25rem] border border-slate-200/90 bg-white p-4 shadow-sm">
          <p className="mb-2 text-sm font-bold text-slate-800">{t('profile_page.spoken_languages')}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {PUBLIC_PROFILE_SPOKEN_LANGUAGES.map((option) => {
              const active = spokenLanguages.includes(option.code);
              return (
                <button
                  key={option.code}
                  type="button"
                  onClick={() => toggleLanguage(option.code)}
                  className={`rounded-xl border px-3 py-2 text-left text-sm font-bold transition-colors ${
                    active
                      ? 'border-blue-600 bg-blue-50 text-blue-900'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
                  }`}
                >
                  {getSpokenLanguageLabel(option.code, t)}
                </button>
              );
            })}
          </div>
        </section>

        {isHelper ? (
          <section className="rounded-[1.25rem] border border-slate-200/90 bg-white p-4 shadow-sm">
            <label className="block text-sm font-bold text-slate-800">
              {t('helper_categories.primary_label')}
              <select
                value={primaryCategory}
                onChange={(e) => {
                  const next = e.target.value;
                  if (isOfficialServiceCategoryId(next)) setPrimaryCategory(next);
                }}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                {SERVICE_CATEGORIES.map((category) => (
                  <option key={category.id} value={category.id}>
                    {translateCategory(category.id, t)}
                  </option>
                ))}
              </select>
            </label>
            <p className="mt-2 text-xs font-medium text-slate-500">{t('helper_categories.primary_hint')}</p>
          </section>
        ) : null}

        {locationLabel ? (
          <section className="rounded-[1.25rem] border border-slate-200/90 bg-white p-4 shadow-sm">
            <p className="text-sm font-bold text-slate-800">{t('profile_page.indicator_location')}</p>
            <p className="mt-2 flex min-w-0 items-center gap-1.5 text-sm font-semibold text-slate-600">
              <MapPin className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              <span className="truncate">{locationLabel}</span>
            </p>
          </section>
        ) : null}

        <button
          type="button"
          disabled={saving || !isConfigured}
          onClick={() => void savePublicProfile()}
          className="inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-[#2563FF] px-4 text-sm font-black text-white shadow-[0_12px_28px_rgba(37,99,255,0.28)] disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          {t('profile_page.public_edit_save')}
        </button>
      </div>
    </AppPageShell>
  );
}
