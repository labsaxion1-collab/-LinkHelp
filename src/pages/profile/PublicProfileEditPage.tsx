import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Check, Loader2, MapPin, Pencil, Plus, X } from 'lucide-react';
import { clsx } from 'clsx';
import { AppPageShell } from '@/components/design-system/AppPageShell';
import { DesktopBackButton } from '@/components/layout/DesktopBackButton';
import { FilePickerLabel } from '@/components/common/HiddenFileInput';
import { ProfileMultiSelectSheet } from '@/components/profile/ProfileMultiSelectSheet';
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
  defaultSkillKeysForServiceCategories,
  normalizePublicHelperCategorySelection,
  removePublicHelperCategory,
  splitPublicHelperCategories,
  togglePublicHelperCategoryDraft,
} from '@/utils/publicHelperCategories';
import { extractErrorMessage, formatAuthFlowErrorMessage } from '@/utils/errorMessage';
import { fileFromDataUrl, formatStorageError, uploadAvatarImage } from '@/lib/storageUpload';
import { cropSquareAvatarFromFile } from '@/utils/avatarMediaProcessing';
import { logMediaPicker } from '@/utils/mediaPickerDebug';
import { profileInitials } from '@/components/profile/profileDisplay';
import { syncHelperSkills } from '@/services/supabase/helperSkillsRemote';
import { ROUTES } from '@/utils/constants';

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
  const [languagePickerOpen, setLanguagePickerOpen] = useState(false);
  const [languageDraft, setLanguageDraft] = useState<string[]>([]);
  const [languageConfirming, setLanguageConfirming] = useState(false);
  const [languageIconsEditMode, setLanguageIconsEditMode] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<ServiceCategoryId[]>(['cleaning']);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [categoryDraft, setCategoryDraft] = useState<ServiceCategoryId[]>(['cleaning']);
  const [categoryConfirming, setCategoryConfirming] = useState(false);
  const [categoryIconsEditMode, setCategoryIconsEditMode] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const canOpenCategoryPicker = true;
  const canAddLanguage = PUBLIC_PROFILE_SPOKEN_LANGUAGES.length > 0;

  const revokeAvatarObjectUrl = () => {
    if (avatarObjectUrlRef.current) {
      URL.revokeObjectURL(avatarObjectUrlRef.current);
      avatarObjectUrlRef.current = null;
    }
    setAvatarPreviewUrl(null);
  };

  useEffect(() => () => revokeAvatarObjectUrl(), []);

  useEffect(
    () => () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    },
    [],
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
    setSelectedCategories(
      normalizePublicHelperCategorySelection(
        profile.primary_category,
        (profile.secondary_categories as string[] | null) ?? [],
      ),
    );
  }, [profile, language, storedLanguages]);

  useEffect(() => {
    if (!isHelper || !profile) return;
    if (typeof window === 'undefined') return;
    if (window.location.hash !== '#helper-categories') return;
    const cats = normalizePublicHelperCategorySelection(
      profile.primary_category,
      (profile.secondary_categories as string[] | null) ?? [],
    );
    setCategoryDraft(cats);
    setCategoryPickerOpen(true);
  }, [isHelper, profile?.id, profile?.primary_category, profile?.secondary_categories]);

  const openCategoryPicker = () => {
    setCategoryIconsEditMode(false);
    setCategoryDraft(selectedCategories);
    setCategoryPickerOpen(true);
  };

  const closeCategoryPicker = () => {
    if (categoryConfirming) return;
    setCategoryPickerOpen(false);
  };

  const openLanguagePicker = () => {
    setLanguageIconsEditMode(false);
    setLanguageDraft(spokenLanguages);
    setLanguagePickerOpen(true);
  };

  const closeLanguagePicker = () => {
    if (languageConfirming) return;
    setLanguagePickerOpen(false);
  };

  const toggleLanguageDraft = (code: string) => {
    if (!isPublicProfileSpokenLanguageCode(code)) return;
    setLanguageDraft((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  const toggleCategoryDraft = (id: ServiceCategoryId) => {
    setCategoryDraft((prev) => togglePublicHelperCategoryDraft(prev, id));
  };

  const persistHelperCategories = async (categories: ServiceCategoryId[]) => {
    const { primary, additional } = splitPublicHelperCategories(categories);
    const err = await updateProfile({
      primary_category: primary,
      secondary_categories: additional,
    });
    if (err) throw err;
    const helperId = session?.user?.id ?? profile?.id;
    if (helperId && isConfigured) {
      await syncHelperSkills(helperId, defaultSkillKeysForServiceCategories(categories));
    }
    await refreshProfile();
    setSelectedCategories(categories);
  };

  const confirmCategoryDraft = async () => {
    if (categoryConfirming || categoryDraft.length === 0) return;
    setCategoryConfirming(true);
    try {
      await persistHelperCategories(categoryDraft);
      setCategoryPickerOpen(false);
      showToast(t('helper_categories.saved_ok'), 'success');
      if (typeof window !== 'undefined' && window.location.hash === '#helper-categories') {
        navigate(ROUTES.helperDashboard, { replace: true });
      }
    } catch (e) {
      showToast(extractErrorMessage(e, t('helper_categories.save_error')), 'error');
    } finally {
      setCategoryConfirming(false);
    }
  };

  const confirmLanguageDraft = async () => {
    if (languageConfirming) return;
    setLanguageConfirming(true);
    try {
      const next = languageDraft.filter(isPublicProfileSpokenLanguageCode);
      if (!isConfigured || !profile) {
        setSpokenLanguages(next);
        setLanguagePickerOpen(false);
        return;
      }
      const err = await updateProfile({
        spoken_languages: mergeSpokenLanguagesForSave(next, storedLanguages),
      });
      if (err) throw err;
      await refreshProfile();
      setSpokenLanguages(next);
      setLanguagePickerOpen(false);
      showToast(t('profile_page.spoken_languages_saved_ok'), 'success');
    } catch (e) {
      showToast(extractErrorMessage(e, t('profile_page.spoken_languages_save_error')), 'error');
    } finally {
      setLanguageConfirming(false);
    }
  };

  const removeLanguage = (code: string) => {
    setSpokenLanguages((prev) => prev.filter((id) => id !== code));
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

  const removeCategory = (id: ServiceCategoryId) => {
    setSelectedCategories((prev) => removePublicHelperCategory(prev, id));
  };

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const startCategoryLongPress = () => {
    clearLongPressTimer();
    longPressTimerRef.current = setTimeout(() => {
      setCategoryIconsEditMode(true);
      longPressTimerRef.current = null;
    }, 480);
  };

  const startLanguageLongPress = () => {
    clearLongPressTimer();
    longPressTimerRef.current = setTimeout(() => {
      setLanguageIconsEditMode(true);
      longPressTimerRef.current = null;
    }, 480);
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
      if (isHelper && session?.user?.id && isConfigured) {
        await syncHelperSkills(
          session.user.id,
          defaultSkillKeysForServiceCategories(selectedCategories),
        );
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
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-bold text-slate-800">{t('profile_page.spoken_languages')}</p>
            {spokenLanguages.length > 0 ? (
              <button
                type="button"
                data-testid="public-edit-language-icons-mode"
                onClick={() => setLanguageIconsEditMode((v) => !v)}
                className={clsx(
                  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition',
                  languageIconsEditMode
                    ? 'border-[#2563FF]/40 bg-blue-50 text-[#2563FF]'
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50',
                )}
                aria-label={languageIconsEditMode ? t('common.close') : t('common.edit')}
                aria-pressed={languageIconsEditMode}
              >
                {languageIconsEditMode ? (
                  <Check className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <Pencil className="h-3.5 w-3.5" aria-hidden />
                )}
              </button>
            ) : null}
          </div>
          <div
            className="mt-3 flex items-center gap-2 overflow-x-auto hide-scrollbar pb-0.5"
            data-testid="public-edit-spoken-languages"
            data-icons-only="true"
          >
            {spokenLanguages.map((code) => {
              const canRemove = languageIconsEditMode;
              return (
                <div key={code} className="relative shrink-0">
                  <button
                    type="button"
                    data-language-code={code}
                    aria-label={getSpokenLanguageLabel(code, t)}
                    onPointerDown={startLanguageLongPress}
                    onPointerUp={clearLongPressTimer}
                    onPointerLeave={clearLongPressTimer}
                    onPointerCancel={clearLongPressTimer}
                    onClick={() => {
                      if (canRemove) removeLanguage(code);
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200/90 bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-700 transition sm:h-[30px] sm:w-[30px]"
                  >
                    {code.toUpperCase()}
                  </button>
                  {canRemove ? (
                    <span
                      className="pointer-events-none absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-slate-900 text-white shadow-sm"
                      aria-hidden
                    >
                      <X className="h-2.5 w-2.5" strokeWidth={3} />
                    </span>
                  ) : null}
                </div>
              );
            })}
            {canAddLanguage ? (
              <button
                type="button"
                onClick={openLanguagePicker}
                data-testid="public-edit-add-language"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed border-slate-300 bg-white text-slate-500 transition hover:border-[#2563FF] hover:text-[#2563FF] sm:h-[30px] sm:w-[30px]"
                aria-label={t('profile_page.add_spoken_language')}
              >
                <Plus className="h-4 w-4" aria-hidden />
              </button>
            ) : null}
          </div>
        </section>

        {isHelper ? (
          <section className="rounded-[1.25rem] border border-slate-200/90 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-800">{t('helper_categories.primary_label')}</p>
                <p className="mt-1 text-xs font-medium text-slate-500">{t('helper_categories.secondary_hint')}</p>
              </div>
              {selectedCategories.length > 1 ? (
                <button
                  type="button"
                  data-testid="public-edit-category-icons-mode"
                  onClick={() => setCategoryIconsEditMode((v) => !v)}
                  className={clsx(
                    'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition',
                    categoryIconsEditMode
                      ? 'border-[#2563FF]/40 bg-blue-50 text-[#2563FF]'
                      : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50',
                  )}
                  aria-label={categoryIconsEditMode ? t('common.close') : t('common.edit')}
                  aria-pressed={categoryIconsEditMode}
                >
                  {categoryIconsEditMode ? (
                    <Check className="h-3.5 w-3.5" aria-hidden />
                  ) : (
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                  )}
                </button>
              ) : null}
            </div>
            <div
              className="mt-3 flex items-center gap-2 overflow-x-auto hide-scrollbar pb-0.5"
              data-testid="public-edit-primary-category"
              data-icons-only="true"
            >
              {selectedCategories.map((categoryId, index) => {
                const theme = getCategoryFeedTheme(categoryId);
                const Icon = getCategoryIconById(categoryId);
                const isPrimary = index === 0;
                const canRemove = categoryIconsEditMode && selectedCategories.length > 1;
                return (
                  <div key={categoryId} className="relative shrink-0">
                    <button
                      type="button"
                      data-category-id={categoryId}
                      data-primary={isPrimary ? 'true' : 'false'}
                      aria-label={translateCategory(categoryId, t)}
                      onPointerDown={startCategoryLongPress}
                      onPointerUp={clearLongPressTimer}
                      onPointerLeave={clearLongPressTimer}
                      onPointerCancel={clearLongPressTimer}
                      onClick={() => {
                        if (canRemove) removeCategory(categoryId);
                      }}
                      className={clsx(
                        'flex h-8 w-8 items-center justify-center rounded-full border transition sm:h-[30px] sm:w-[30px]',
                        isPrimary ? 'border-[#2563FF]/45 ring-2 ring-[#2563FF]/15' : 'border-slate-200/90',
                      )}
                      style={{ backgroundColor: theme.iconBg, color: theme.iconColor }}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                    </button>
                    {canRemove ? (
                      <span
                        className="pointer-events-none absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-slate-900 text-white shadow-sm"
                        aria-hidden
                      >
                        <X className="h-2.5 w-2.5" strokeWidth={3} />
                      </span>
                    ) : null}
                  </div>
                );
              })}
              {canOpenCategoryPicker ? (
                <button
                  type="button"
                  onClick={openCategoryPicker}
                  data-testid="public-edit-add-category"
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed border-slate-300 bg-white text-slate-500 transition hover:border-[#2563FF] hover:text-[#2563FF] sm:h-[30px] sm:w-[30px]"
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

      <ProfileMultiSelectSheet
        open={languagePickerOpen}
        onClose={closeLanguagePicker}
        title={t('profile_page.spoken_languages')}
        subtitle={t('profile_page.spoken_languages_picker_hint')}
        closeLabel={t('common.cancel')}
        testId="public-edit-language-picker"
        busy={languageConfirming}
        footer={
          <div className="flex gap-2">
            <button
              type="button"
              data-testid="public-edit-cancel-languages"
              disabled={languageConfirming}
              onClick={closeLanguagePicker}
              className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 disabled:opacity-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              data-testid="public-edit-confirm-languages"
              disabled={languageConfirming}
              onClick={() => void confirmLanguageDraft()}
              className="inline-flex min-h-[48px] flex-[1.4] items-center justify-center gap-2 rounded-2xl bg-[#2563FF] px-4 text-sm font-black text-white shadow-[0_10px_24px_rgba(37,99,255,0.28)] disabled:opacity-50"
              aria-label={t('profile_page.confirm_spoken_languages')}
            >
              {languageConfirming ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Check className="h-4 w-4" aria-hidden />
              )}
              {t('profile_page.confirm_spoken_languages')}
            </button>
          </div>
        }
      >
        <ul className="space-y-1">
          {PUBLIC_PROFILE_SPOKEN_LANGUAGES.map((option) => {
            const selected = languageDraft.includes(option.code);
            return (
              <li key={option.code}>
                <button
                  type="button"
                  data-picker-language-code={option.code}
                  data-picker-selected={selected ? 'true' : 'false'}
                  onClick={() => toggleLanguageDraft(option.code)}
                  className={clsx(
                    'flex w-full items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left transition',
                    selected
                      ? 'bg-blue-50/90 ring-1 ring-inset ring-[#2563FF]/25'
                      : 'hover:bg-slate-50',
                  )}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-[11px] font-black uppercase tracking-wide text-slate-700">
                    {option.code.toUpperCase()}
                  </span>
                  <span
                    className={clsx(
                      'min-w-0 flex-1 truncate text-sm font-bold',
                      selected ? 'text-[#2563FF]' : 'text-slate-900',
                    )}
                  >
                    <span className="mr-1.5 font-black uppercase text-slate-500">{option.code}</span>
                    — {getSpokenLanguageLabel(option.code, t)}
                  </span>
                  {selected ? <Check className="h-4 w-4 shrink-0 text-[#2563FF]" aria-hidden /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      </ProfileMultiSelectSheet>

      <ProfileMultiSelectSheet
        open={categoryPickerOpen}
        onClose={closeCategoryPicker}
        title={t('helper_categories.picker_title')}
        subtitle={t('helper_categories.selected_count', { count: categoryDraft.length })}
        closeLabel={t('common.cancel')}
        testId="public-edit-category-picker"
        busy={categoryConfirming}
        footer={
          <button
            type="button"
            data-testid="public-edit-confirm-categories"
            disabled={categoryConfirming || categoryDraft.length === 0}
            onClick={() => void confirmCategoryDraft()}
            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-[#2563FF] px-4 text-sm font-black text-white shadow-[0_10px_24px_rgba(37,99,255,0.28)] disabled:opacity-50"
            aria-label={t('helper_categories.confirm_categories')}
          >
            {categoryConfirming ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Check className="h-4 w-4" aria-hidden />
            )}
            {t('helper_categories.confirm_categories')}
          </button>
        }
      >
        <ul className="space-y-1">
          {SERVICE_CATEGORIES.map((cat) => {
            const theme = getCategoryFeedTheme(cat.id);
            const Icon = getCategoryIconById(cat.id);
            const selected = categoryDraft.includes(cat.id);
            return (
              <li key={cat.id}>
                <button
                  type="button"
                  data-picker-category-id={cat.id}
                  data-picker-selected={selected ? 'true' : 'false'}
                  onClick={() => toggleCategoryDraft(cat.id)}
                  className={clsx(
                    'flex w-full items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left transition',
                    selected
                      ? 'bg-blue-50/90 ring-1 ring-inset ring-[#2563FF]/25'
                      : 'hover:bg-slate-50',
                  )}
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: theme.iconBg, color: theme.iconColor }}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span
                    className={clsx(
                      'min-w-0 flex-1 truncate text-sm font-bold',
                      selected ? 'text-[#2563FF]' : 'text-slate-900',
                    )}
                  >
                    {translateCategory(cat.id, t)}
                  </span>
                  {selected ? <Check className="h-4 w-4 shrink-0 text-[#2563FF]" aria-hidden /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      </ProfileMultiSelectSheet>
    </AppPageShell>
  );
}
