import { type ComponentType, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  Briefcase,
  Check,
  ChevronRight,
  Coins,
  Globe2,
  Languages,
  Loader2,
  Pencil,
  Settings,
  Star,
  UserRound,
  X,
} from 'lucide-react';
import { FilePickerLabel } from '@/components/common/HiddenFileInput';
import { AppPageShell } from '@/components/design-system/AppPageShell';
import { DesktopBackButton } from '@/components/layout/DesktopBackButton';
import { useAuth } from '@/context/AuthContext';
import { useAppMode } from '@/context/AppModeContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { useWalletBalance } from '@/hooks/useWalletBalance';
import { ROUTES } from '@/utils/constants';
import { BRAND } from '@/utils/brandAssets';
import { formatLinkCredits } from '@/utils/formatLinkCredits';
import { HelperScorePanel } from '@/components/features/HelperScorePanel';
import { type ServiceCategoryId } from '@/data/serviceCategories';
import { fetchHelperSkills, syncHelperSkills } from '@/services/supabase/helperSkillsRemote';
import { filterValidSkillKeys } from '@/data/helperSkillsCatalog';
import { deriveHelperCategoriesFromSkillKeys, getHelperCategoryPreferences } from '@/utils/helperCategoryPreferences';
import { HelperCategoriesManager } from '@/components/helper/HelperCategoriesManager';
import { fileFromDataUrl, formatStorageError, uploadAvatarImage } from '@/lib/storageUpload';
import { cropSquareAvatarFromFile } from '@/utils/portfolioMediaProcessing';

function profileInitials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || 'LH';
  const parts = source.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? 'L';
  const second = parts.length > 1 ? parts[1]?.[0] : parts[0]?.[1];
  return `${first}${second ?? ''}`.toUpperCase();
}

function ProfileInfoRow({
  icon: Icon,
  label,
  value,
  badge,
  onClick,
  actionIcon: ActionIcon,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  badge?: string;
  onClick?: () => void;
  actionIcon?: ComponentType<{ className?: string }>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-4 rounded-[1.35rem] border border-slate-100 bg-white px-4 py-3.5 text-left shadow-[0_10px_26px_rgba(15,23,42,0.035)] transition hover:border-blue-100 hover:bg-[#F8FBFF]"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F1F6FF] text-[#2563FF]">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-black uppercase tracking-wide text-[#2563FF]/75">
          {label}
        </span>
        <span className="mt-0.5 flex min-w-0 items-center gap-2">
          <span className="truncate text-[15px] font-bold leading-tight text-[#0B1220]">{value}</span>
          {badge ? (
            <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700">
              {badge}
            </span>
          ) : null}
        </span>
      </span>
      {ActionIcon ? (
        <ActionIcon className="h-5 w-5 shrink-0 text-slate-400 transition group-hover:text-[#2563FF]" />
      ) : (
        <ChevronRight className="h-5 w-5 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-[#2563FF]" />
      )}
    </button>
  );
}

export default function ProfilePage() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, session, updateProfile, refreshProfile, isConfigured } = useAuth();
  const { isHelperMode } = useAppMode();
  const { showToast } = useToast();
  const { balance, loading, refresh: refreshWallet } = useWalletBalance();
  const [helperSkillIds, setHelperSkillIds] = useState<string[]>([]);
  const [primaryCategory, setPrimaryCategory] = useState<ServiceCategoryId>('cleaning');
  const [secondaryCategories, setSecondaryCategories] = useState<ServiceCategoryId[]>([]);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const avatarObjectUrlRef = useRef<string | null>(null);
  const categoriesSectionRef = useRef<HTMLElement | null>(null);
  const [bioEditing, setBioEditing] = useState(false);
  const [bioValue, setBioValue] = useState('');
  const [bioSaving, setBioSaving] = useState(false);

  const email = session?.user.email ?? profile?.email ?? '';
  const displayName = profile?.name?.trim() || session?.user.user_metadata?.name || email || 'LinkHelp';
  const initials = profileInitials(displayName, email);
  const avatarUrl = avatarPreviewUrl ?? profile?.avatar_url?.trim() ?? '';
  const roleLabel = profile?.role === 'helper' ? 'Helper' : profile?.role === 'client' ? 'Cliente' : 'LinkHelp';
  const bio = profile?.bio?.trim() || '';
  const balanceLabel = loading ? '...' : formatLinkCredits(balance ?? 0);

  const LANGUAGE_LABELS: Record<string, string> = {
    pt: 'Português', en: 'English', fr: 'Français', es: 'Español',
    ar: 'Árabe', zh: 'Mandarim', hi: 'Hindi', it: 'Italiano',
    ht: 'Crioulo Haitiano', pa: 'Punjabi',
  };
  const spokenLanguageLabels = (profile?.spoken_languages ?? [])
    .map((id) => LANGUAGE_LABELS[id] ?? id)
    .filter(Boolean);

  const revokeAvatarObjectUrl = () => {
    if (avatarObjectUrlRef.current) {
      URL.revokeObjectURL(avatarObjectUrlRef.current);
      avatarObjectUrlRef.current = null;
    }
    setAvatarPreviewUrl(null);
  };

  useEffect(() => () => revokeAvatarObjectUrl(), []);

  // Fetch fresh wallet balance every time this page is opened (prevents stale context).
  useEffect(() => {
    if (profile?.role !== 'helper') return;
    void refreshWallet();
  }, [profile?.role, refreshWallet]);

  useEffect(() => {
    if (!profile || !isHelperMode) return;
    const prefs = getHelperCategoryPreferences(profile, helperSkillIds);
    setPrimaryCategory(prefs.primaryCategory);
    setSecondaryCategories(prefs.secondaryCategories);
  }, [profile, isHelperMode, helperSkillIds]);

  useEffect(() => {
    if (!session?.user?.id || !isHelperMode || !isConfigured) {
      setHelperSkillIds([]);
      return;
    }
    void fetchHelperSkills(session.user.id).then(setHelperSkillIds);
  }, [session?.user?.id, isHelperMode, isConfigured]);

  useEffect(() => {
    if (location.hash !== '#helper-categories' || !categoriesSectionRef.current) return;
    const timer = setTimeout(() => {
      categoriesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
    return () => clearTimeout(timer);
  }, [location.hash]);

  const persistHelperSkills = async (
    ids: string[],
    categoryOverride?: { primary: ServiceCategoryId; secondary: ServiceCategoryId[] },
  ) => {
    const valid = filterValidSkillKeys(ids);
    setHelperSkillIds(valid);
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

  const saveAvatarFile = async (file: File) => {
    if (!isConfigured || !session?.user?.id) {
      showToast(t('app_pages.settings_saved'), 'info');
      return;
    }
    revokeAvatarObjectUrl();
    const preview = URL.createObjectURL(file);
    avatarObjectUrlRef.current = preview;
    setAvatarPreviewUrl(preview);
    setAvatarSaving(true);
    try {
      let uploadFile: File = file;
      try {
        const cropped = await cropSquareAvatarFromFile(file);
        uploadFile = await fileFromDataUrl(cropped, 'avatar.jpg', 'image/jpeg');
      } catch {
        uploadFile = file;
      }
      const { publicUrl } = await uploadAvatarImage(session.user.id, uploadFile);
      const err = await updateProfile({ avatar_url: publicUrl });
      if (err) {
        showToast(t(err.messageKey, err.vars), 'error');
        return;
      }
      await refreshProfile();
      revokeAvatarObjectUrl();
      showToast(t('app_pages.settings_avatar_saved'), 'success');
    } catch (e) {
      const raw = formatStorageError(e);
      showToast(raw && raw !== 'NO_SUPABASE' ? raw : t('profile_setup.avatar_save_error'), 'error');
    } finally {
      setAvatarSaving(false);
    }
  };

  const onAvatarFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file || avatarSaving) return;
    void saveAvatarFile(file);
  };

  const saveBio = async () => {
    if (!isConfigured || !profile) return;
    setBioSaving(true);
    const err = await updateProfile({ bio: bioValue.trim() || null });
    setBioSaving(false);
    if (err) {
      showToast(t(err.messageKey, err.vars), 'error');
      return;
    }
    await refreshProfile();
    setBioEditing(false);
    showToast(t('app_pages.settings_saved'), 'success');
  };

  return (
    <AppPageShell className="w-full">
      <DesktopBackButton className="mb-3" />
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-1 pb-28 md:pb-8">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-900 md:hidden"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('nav.back')}
        </button>

        <section className="relative overflow-hidden rounded-[2.15rem] bg-[#06143B] p-5 text-white shadow-[0_26px_70px_rgba(7,18,56,0.28)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_17%_0%,rgba(37,99,255,0.58),transparent_30%),linear-gradient(140deg,rgba(37,99,255,0.62)_0%,rgba(4,18,58,0.38)_42%,rgba(2,8,31,0.95)_100%)]" />
          <div className="pointer-events-none absolute -bottom-14 -left-16 h-48 w-48 rounded-full border border-blue-400/25" />
          <div className="pointer-events-none absolute bottom-16 left-12 h-px w-[120%] -rotate-[16deg] bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent shadow-[0_0_26px_rgba(34,211,238,0.8)]" />
          <div className="pointer-events-none absolute bottom-24 right-0 h-px w-[90%] -rotate-[10deg] bg-gradient-to-r from-transparent via-blue-500/80 to-transparent shadow-[0_0_24px_rgba(37,99,255,0.9)]" />

          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[12px] font-black uppercase tracking-[0.24em] text-sky-300">Meu perfil</p>
              <h1 className="mt-3 max-w-[13rem] text-[34px] font-black leading-none tracking-tight text-white drop-shadow-[0_0_18px_rgba(255,255,255,0.32)] sm:max-w-none sm:text-4xl">
                {displayName}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0F4DDB]/55 px-3 py-1.5 text-sm font-black ring-1 ring-white/12">
                  <BadgeCheck className="h-4 w-4 rounded-full bg-[#2563FF] p-0.5 text-white" />
                  {roleLabel}
                </span>
                {profile?.rating != null && profile.rating > 0 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-300/14 px-3 py-1.5 text-sm font-black text-amber-200 ring-1 ring-amber-200/20">
                    <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
                    {profile.rating.toFixed(1)}
                  </span>
                ) : null}
              </div>
            </div>
            <FilePickerLabel
              accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              disabled={!isConfigured || avatarSaving}
              onFiles={onAvatarFiles}
              className="relative h-[88px] w-[88px] shrink-0 cursor-pointer overflow-hidden rounded-[1.65rem] bg-gradient-to-br from-[#1D6DFF] to-[#0757F2] shadow-[0_18px_45px_rgba(37,99,255,0.35)] ring-2 ring-cyan-300/35 transition hover:scale-[1.02] hover:ring-cyan-200/70 disabled:cursor-not-allowed disabled:opacity-70 sm:h-28 sm:w-28 sm:rounded-[2rem]"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[42px] font-black text-white sm:text-6xl">
                  {initials}
                </div>
              )}
              {avatarSaving ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/35">
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                </div>
              ) : null}
            </FilePickerLabel>
          </div>

          <div className="relative mt-7 overflow-hidden rounded-[1.65rem] border border-white/12 bg-[linear-gradient(145deg,rgba(255,255,255,0.18),rgba(255,255,255,0.06)_45%,rgba(37,99,255,0.12))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_18px_42px_rgba(0,0,0,0.22)] ring-1 ring-white/10 backdrop-blur-xl">
            <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-amber-300/18 blur-2xl" />
            <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
            <div className="pointer-events-none absolute -bottom-10 left-8 h-24 w-40 rounded-full bg-blue-400/16 blur-2xl" />
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[12px] font-black uppercase tracking-[0.20em] text-white/70 drop-shadow-[0_0_12px_rgba(255,255,255,0.26)]">LinkCredit</p>
                <p className="mt-2 text-[34px] font-black leading-none text-amber-300 drop-shadow-[0_0_18px_rgba(251,191,36,0.22)]">
                  {balanceLabel}
                </p>
              </div>
              <img src={BRAND.linkCreditCoin} alt="" loading="lazy" decoding="async" className="h-16 w-16 rounded-full object-cover drop-shadow-[0_10px_22px_rgba(251,191,36,0.28)]" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link
                to={ROUTES.helperLinkCredits}
                className="group relative flex min-h-[54px] items-center justify-center gap-2 overflow-hidden rounded-2xl bg-white px-3 py-2 text-sm font-black text-blue-700 shadow-[0_14px_28px_rgba(255,255,255,0.12),0_10px_24px_rgba(37,99,255,0.18)] ring-1 ring-white/70 transition hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(255,255,255,0.16),0_14px_30px_rgba(37,99,255,0.24)]"
              >
                <span className="pointer-events-none absolute inset-y-0 -left-10 w-10 rotate-12 bg-white/70 blur-md transition-transform duration-700 group-hover:translate-x-40" />
                Comprar Pacote
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
              <Link
                to={ROUTES.helperCredits}
                className="group relative flex min-h-[54px] items-center justify-center gap-2 overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.16),rgba(255,255,255,0.06))] px-3 py-2 text-sm font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_12px_24px_rgba(0,0,0,0.12)] ring-1 ring-white/12 backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white/16 hover:ring-white/22"
              >
                <span className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/55 to-transparent" />
                Carteira
                <Coins className="h-3.5 w-3.5 transition-transform group-hover:rotate-12" />
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-[1.9rem] border border-slate-100 bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.065)]">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-950">{t('profile_page.section_public_title')}</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">{t('profile_page.section_public_subtitle')}</p>
            </div>
            <button
              type="button"
              onClick={() => navigate(ROUTES.settings)}
              className="flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              <Settings className="h-3.5 w-3.5" />
              {t('profile_page.edit_in_settings')}
            </button>
          </div>

          <div className="space-y-3">
            {isHelperMode ? (
              bioEditing ? (
                <div className="rounded-[1.35rem] border border-blue-200 bg-[#F8FBFF] p-4 shadow-[0_10px_26px_rgba(37,99,255,0.06)]">
                  <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-[#2563FF]/75">Bio</p>
                  <textarea
                    rows={4}
                    value={bioValue}
                    onChange={(e) => setBioValue(e.target.value)}
                    placeholder={t('profile_page.bio_placeholder')}
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#0B1220] outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    autoFocus
                  />
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      disabled={bioSaving}
                      onClick={() => void saveBio()}
                      className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      {bioSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      {t('app_pages.settings_save')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setBioEditing(false)}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                    >
                      <X className="h-3.5 w-3.5" />
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <ProfileInfoRow
                  icon={UserRound}
                  label="Bio"
                  value={bio || t('profile_page.bio_empty')}
                  onClick={() => { setBioValue(bio); setBioEditing(true); }}
                  actionIcon={Pencil}
                />
              )
            ) : null}

            {isHelperMode && spokenLanguageLabels.length > 0 ? (
              <div className="flex items-center gap-4 rounded-[1.35rem] border border-slate-100 bg-white px-4 py-3.5 shadow-[0_10px_26px_rgba(15,23,42,0.035)]">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F1F6FF] text-[#2563FF]">
                  <Languages className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-black uppercase tracking-wide text-[#2563FF]/75">
                    {t('profile_page.spoken_languages')}
                  </span>
                  <span className="mt-1.5 flex flex-wrap gap-1.5">
                    {spokenLanguageLabels.map((label) => (
                      <span
                        key={label}
                        className="rounded-full bg-[#F1F6FF] px-2.5 py-0.5 text-[12px] font-bold text-[#2563FF]"
                      >
                        {label}
                      </span>
                    ))}
                  </span>
                </span>
                <Globe2 className="h-5 w-5 shrink-0 text-slate-300" />
              </div>
            ) : isHelperMode ? (
              <button
                type="button"
                onClick={() => navigate(ROUTES.settings)}
                className="group flex w-full items-center gap-4 rounded-[1.35rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-3.5 text-left transition hover:border-blue-200 hover:bg-[#F8FBFF]"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <Languages className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-black uppercase tracking-wide text-slate-400">
                    {t('profile_page.spoken_languages')}
                  </span>
                  <span className="mt-0.5 text-sm font-semibold text-slate-400">
                    {t('profile_page.spoken_languages_empty')}
                  </span>
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 transition group-hover:text-blue-400" />
              </button>
            ) : null}
          </div>
        </section>

        {/* Perfil verificado — placeholder for future verification feature */}

        {isHelperMode ? (
          <>
            <section className="grid gap-3">
              <section
                id="helper-categories"
                ref={categoriesSectionRef}
                className="rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-[0_14px_32px_rgba(15,23,42,0.05)]"
              >
                <div className="mb-3 flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EEF3FF] text-[#2563FF]">
                    <Briefcase className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-sm font-black text-slate-950">Categorias do Helper</h2>
                    <p className="mt-0.5 text-xs font-medium text-slate-500">Especialidades vis?veis no perfil.</p>
                  </div>
                </div>
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
                  iconOnlySummary
                />
              </section>

            <HelperScorePanel
              collapsible
              defaultExpanded={false}
              className="rounded-[1.75rem] border border-slate-100 bg-white shadow-[0_18px_42px_rgba(15,23,42,0.06)]"
            />
            </section>
          </>
        ) : null}

      </div>
    </AppPageShell>
  );
}
