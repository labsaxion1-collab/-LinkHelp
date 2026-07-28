import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Loader2, MapPin, Plus, X } from 'lucide-react';
import { clsx } from 'clsx';
import { AppPageShell } from '@/components/design-system/AppPageShell';
import { DesktopBackButton } from '@/components/layout/DesktopBackButton';
import { FilePickerLabel } from '@/components/common/HiddenFileInput';
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
import { SERVICE_CATEGORIES, type ServiceCategoryId } from '@/data/serviceCategories';
import { translateCategory } from '@/utils/translateCategory';
import { getCategoryFeedTheme } from '@/utils/categoryFeedTheme';
import { getCategoryIconById } from '@/utils/categoryIcons';
import {
  MAX_PUBLIC_HELPER_CATEGORIES,
  addPublicHelperCategory,
  normalizePublicHelperCategorySelection,
  removePublicHelperCategory,
  splitPublicHelperCategories,
} from '@/utils/publicHelperCategories';
import { extractErrorMessage, formatAuthFlowErrorMessage } from '@/utils/errorMessage';
import { fileFromDataUrl, formatStorageError, uploadAvatarImage } from '@/lib/storageUpload';
import { cropSquareAvatarFromFile } from '@/utils/avatarMediaProcessing';
import { logMediaPicker } from '@/utils/mediaPickerDebug';
import { profileInitials } from '@/components/profile/profileDisplay';

const AVATAR_ACCEPT = 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp';
const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

function isAllowedAvatarFile(file: File): boolean {
  const mime = file.type.toLowerCase();
  if (mime === 'image/jpeg' || mime === 'image/png' || mime === 'image/webp') return true;
  const name = file.name.toLowerCase();
  return /\.(jpe?g|png|webp)$/.test(name);
}

export default function PublicProfileEditPage() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { profile, session, updateProfile, refreshProfile, isConfigured } = useAuth();
  const { isHelperMode } = useAppMode();
  const { showToast } = useToast();
  const isHelper = profile?.role === 'helper' || isHelperMode;

  const [bio, setBio] = useState('');
  const [spokenLanguages, setSpokenLanguages] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<ServiceCategoryId[]>(['cleaning']);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [avatarSelectedFile, setAvatarSelectedFile] = useState<File | null>(null);
  const avatarObjectUrlRef = useRef<string | null>(null);

  const displayName = profile?.name?.trim() || session?.user.email || 'LinkHelp';
  const savedAvatarUrl = profile?.avatar_url?.trim() || '';
  const avatarDisplay = avatarPreviewUrl ?? (savedAvatarUrl || null);
  const city = isHelper ? profile?.helper_base_city ?? profile?.city : profile?.city;
  const region = isHelper ? profile?.helper_base_province ?? profile?.region : profile?.region;
  const locationLabel = [city, region].filter(Boolean).join(', ');
  const storedLanguages = useMemo(
    () => (Array.isArray(profile?.spoken_languages) ? profile.spoken_languages.filter(Boolean) : []),
    [profile?.spoken_languages],
  );
  const { primary: primaryCategory, additional: additionalCategories } = useMemo(
    () => splitPublicHelperCategories(selectedCategories),
    [selectedCategories],
  );
  const availableToAdd = useMemo(
    () => SERVICE_CATEGORIES.filter((cat) => !selectedCategories.includes(cat.id)),
    [selectedCategories],
  );
  const canAddCategory = selectedCategories.length < MAX_PUBLIC_HELPER_CATEGORIES;

  const revokeAvatarObjectUrl = () => {
    if (avatarObjectUrlRef.current) {
      URL.revokeObjectURL(avatarObjectUrlRef.current);
      avatarObjectUrlRef.current = null;
    }
    setAvatarPreviewUrl(null);
  };

  useEffect(() => () => revokeAvatarObjectUrl(), []);

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
    setSelectedCategories(
      normalizePublicHelperCategorySelection(
        profile.primary_category,
        (profile.secondary_categories as string[] | null) ?? [],
      ),
    );
  }, [profile, language, storedLanguages]);

  const toggleLanguage = (code: string) => {
    setSpokenLanguages((prev) =>
      prev.includes(code) ? prev.filter((id) => id !== code) : [...prev, code],
    );
  };

  const onAvatarFile = (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    if (!isAllowedAvatarFile(f) || f.size > AVATAR_MAX_BYTES) {
      showToast(t('app_pages.avatar_error'), 'error');
      return;
    }
    revokeAvatarObjectUrl();
    const preview = URL.createObjectURL(f);
    avatarObjectUrlRef.current = preview;
    setAvatarSelectedFile(f);
    setAvatarPreviewUrl(preview);
    logMediaPicker('PREVIEW CREATED', preview);
  };

  const addCategory = (id: ServiceCategoryId) => {
    setSelectedCategories((prev) => addPublicHelperCategory(prev, id));
    setCategoryPickerOpen(false);
  };

  const removeCategory = (id: ServiceCategoryId) => {
    setSelectedCategories((prev) => removePublicHelperCategory(prev, id));
  };

  const savePublicProfile = async () => {
    if (!isConfigured || !profile) {
      showToast(t('app_pages.settings_saved'), 'info');
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
        try {
          const { publicUrl } = await uploadAvatarImage(session.user.id, uploadFile);
          const avatarErr = await updateProfile({ avatar_url: publicUrl });
          if (avatarErr) {
            showToast(formatAuthFlowErrorMessage(t, avatarErr), 'error');
            return;
          }
          revokeAvatarObjectUrl();
          setAvatarSelectedFile(null);
        } catch (e) {
          showToast(formatStorageError(e) || t('app_pages.avatar_save_error'), 'error');
          return;
        }
      }

      const nextLanguages = mergeSpokenLanguagesForSave(spokenLanguages, storedLanguages);
      const payload = isHelper
        ? {
            bio: bio.trim() || null,
            spoken_languages: nextLanguages.length ? nextLanguages : [language],
            primary_category: primaryCategory,
            secondary_categories: additionalCategories,
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
            <FilePickerLabel
              accept={AVATAR_ACCEPT}
              disabled={!isConfigured || saving}
              onFiles={onAvatarFile}
              className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-slate-100 bg-slate-100"
            >
              {avatarDisplay ? (
                <img src={avatarDisplay} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-black text-slate-500">
                  {profileInitials(displayName)}
                </div>
              )}
              <span className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-[#2563FF] text-white ring-2 ring-white">
                <Camera className="h-3 w-3" aria-hidden />
              </span>
            </FilePickerLabel>
            <div className="min-w-0 flex-1">
              <FilePickerLabel
                accept={AVATAR_ACCEPT}
                disabled={!isConfigured || saving}
                onFiles={onAvatarFile}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 transition hover:bg-white"
              >
                <Camera className="h-4 w-4" aria-hidden />
                {t('app_pages.settings_avatar_choose')}
              </FilePickerLabel>
              <p className="mt-1.5 text-[11px] font-medium text-slate-500">
                {t('app_pages.settings_avatar_hint')}
              </p>
            </div>
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
            <p className="text-sm font-bold text-slate-800">{t('helper_categories.primary_label')}</p>
            <p className="mt-1 text-xs font-medium text-slate-500">{t('helper_categories.secondary_hint')}</p>
            <div
              className="mt-3 flex flex-wrap items-center gap-2"
              data-testid="public-edit-primary-category"
            >
              {selectedCategories.map((categoryId, index) => {
                const theme = getCategoryFeedTheme(categoryId);
                const Icon = getCategoryIconById(categoryId);
                const isPrimary = index === 0;
                return (
                  <div
                    key={categoryId}
                    data-category-id={categoryId}
                    data-primary={isPrimary ? 'true' : 'false'}
                    className={clsx(
                      'inline-flex max-w-full items-center gap-1.5 rounded-full border py-1.5 pl-1.5 pr-2',
                      isPrimary
                        ? 'border-[#2563FF]/50 bg-blue-50/90'
                        : 'border-slate-200 bg-slate-50',
                    )}
                  >
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: theme.iconBg, color: theme.iconColor }}
                    >
                      <Icon className="h-[15px] w-[15px]" aria-hidden />
                    </span>
                    <span className="max-w-[7.5rem] truncate text-[11px] font-bold text-slate-800">
                      {translateCategory(categoryId, t)}
                    </span>
                    {isPrimary ? (
                      <span className="rounded-md bg-[#2563FF]/12 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-[#2563FF]">
                        {t('helper_categories.primary_badge')}
                      </span>
                    ) : null}
                    {selectedCategories.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removeCategory(categoryId)}
                        className="ml-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                        aria-label={t('helper_categories.remove')}
                      >
                        <X className="h-3 w-3" strokeWidth={2.5} aria-hidden />
                      </button>
                    ) : null}
                  </div>
                );
              })}
              {canAddCategory ? (
                <button
                  type="button"
                  onClick={() => setCategoryPickerOpen(true)}
                  data-testid="public-edit-add-category"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-slate-300 bg-white text-slate-500 transition hover:border-[#2563FF] hover:text-[#2563FF]"
                  aria-label={t('helper_categories.add_category')}
                >
                  <Plus className="h-4 w-4" aria-hidden />
                </button>
              ) : null}
            </div>
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

      {categoryPickerOpen ? (
        <div
          className="fixed inset-0 z-[130] flex items-end justify-center bg-slate-900/45 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:items-center"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0"
            aria-label={t('common.close')}
            onClick={() => setCategoryPickerOpen(false)}
          />
          <div
            className="relative z-10 flex w-full max-w-lg max-h-[70dvh] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            data-testid="public-edit-category-picker"
          >
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <h3 className="text-base font-black text-slate-950">{t('helper_categories.picker_title')}</h3>
              <button
                type="button"
                onClick={() => setCategoryPickerOpen(false)}
                className="rounded-full bg-slate-100 p-2 text-slate-600"
                aria-label={t('common.close')}
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-3 py-3">
              {availableToAdd.map((cat) => {
                const theme = getCategoryFeedTheme(cat.id);
                const Icon = getCategoryIconById(cat.id);
                return (
                  <li key={cat.id}>
                    <button
                      type="button"
                      data-picker-category-id={cat.id}
                      onClick={() => addCategory(cat.id)}
                      className="flex w-full items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left transition hover:bg-slate-50"
                    >
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor: theme.iconBg, color: theme.iconColor }}
                      >
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="truncate text-sm font-bold text-slate-900">
                        {translateCategory(cat.id, t)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : null}
    </AppPageShell>
  );
}
