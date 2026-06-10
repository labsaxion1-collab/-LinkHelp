import { type ComponentType, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  Briefcase,
  CalendarDays,
  ChevronRight,
  Coins,
  Globe2,
  Home,
  IdCard,
  Loader2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Star,
  UserRound,
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
import { formatLinkCredits } from '@/utils/formatLinkCredits';
import { HelperScorePanel } from '@/components/features/HelperScorePanel';
import { type ServiceCategoryId } from '@/data/serviceCategories';
import { fetchHelperSkills, syncHelperSkills } from '@/services/supabase/helperSkillsRemote';
import { filterValidSkillKeys } from '@/data/helperSkillsCatalog';
import { deriveHelperCategoriesFromSkillKeys, getHelperCategoryPreferences } from '@/utils/helperCategoryPreferences';
import { HelperCategoriesManager } from '@/components/helper/HelperCategoriesManager';
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
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  badge?: string;
}) {
  return (
    <button
      type="button"
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
      <ChevronRight className="h-5 w-5 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-[#2563FF]" />
    </button>
  );
}

export default function ProfilePage() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { profile, session, updateProfile, refreshProfile, isConfigured } = useAuth();
  const { isHelperMode } = useAppMode();
  const { showToast } = useToast();
  const { balance, loading } = useWalletBalance();
  const [helperSkillIds, setHelperSkillIds] = useState<string[]>([]);
  const [primaryCategory, setPrimaryCategory] = useState<ServiceCategoryId>('cleaning');
  const [secondaryCategories, setSecondaryCategories] = useState<ServiceCategoryId[]>([]);
  const [helperBaseValue, setHelperBaseValue] = useState<HelperBaseAddressValue>(() =>
    helperBaseAddressFromProfile({}),
  );
  const [baseAddressSaving, setBaseAddressSaving] = useState(false);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const avatarObjectUrlRef = useRef<string | null>(null);

  const email = session?.user.email ?? profile?.email ?? '';
  const displayName = profile?.name?.trim() || session?.user.user_metadata?.name || email || 'LinkHelp';
  const initials = profileInitials(displayName, email);
  const avatarUrl = avatarPreviewUrl ?? profile?.avatar_url?.trim() ?? '';
  const city = [profile?.city, profile?.region].filter(Boolean).join(', ');
  const roleLabel = profile?.role === 'helper' ? 'Helper' : profile?.role === 'client' ? 'Cliente' : 'LinkHelp';
  const bio = profile?.bio?.trim() || 'Adicione uma bio em configurações para deixar seu perfil mais completo.';
  const balanceLabel = loading ? '...' : formatLinkCredits(balance ?? 0);
  const preferredLanguage = profile?.preferred_language || language;
  const languageLabel =
    preferredLanguage === 'en'
      ? 'English'
      : preferredLanguage === 'fr'
        ? 'Français'
        : 'Português (Brasil)';
  const helperBaseLabel = [
    profile?.helper_base_address,
    profile?.helper_base_city,
    profile?.helper_base_province,
    profile?.helper_base_postal_code,
  ]
    .filter(Boolean)
    .join(', ');
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
    if (!profile) return;
    setHelperBaseValue(helperBaseAddressFromProfile(profile));
  }, [profile]);

  const revokeAvatarObjectUrl = () => {
    if (avatarObjectUrlRef.current) {
      URL.revokeObjectURL(avatarObjectUrlRef.current);
      avatarObjectUrlRef.current = null;
    }
    setAvatarPreviewUrl(null);
  };

  useEffect(() => () => revokeAvatarObjectUrl(), []);

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

  const saveHelperBaseAddress = async () => {
    if (!isConfigured || !profile || !isHelperMode) {
      showToast(t('app_pages.settings_saved'), 'info');
      return;
    }
    if (!helperBaseValue.address.trim() && !helperBaseValue.city.trim()) {
      showToast(t('app_pages.settings_helper_base_required'), 'error');
      return;
    }
    if (!baseChangeStatus.allowed && baseChangeStatus.reason === 'locked' && baseHasPendingChanges) {
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
              <img src="/brand/linkcredit-coin-icon.png" alt="" className="h-16 w-16 rounded-full object-cover drop-shadow-[0_10px_22px_rgba(251,191,36,0.28)]" />
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
              <h2 className="text-lg font-black text-slate-950">Informações pessoais</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">Foto, bio e dados visíveis do seu perfil.</p>
            </div>
          </div>

          <div className="space-y-3">
            {isHelperMode ? <ProfileInfoRow icon={UserRound} label="Bio" value={bio} /> : null}
            <ProfileInfoRow icon={Mail} label="Email" value={email || 'Não informado'} />
            <ProfileInfoRow icon={Phone} label="Telefone" value={profile?.phone || 'Não informado'} />
            <ProfileInfoRow icon={MapPin} label="Localização" value={city || 'Não informada'} />
            <ProfileInfoRow icon={CalendarDays} label="Data de nascimento" value="Não informado" />
            {isHelperMode ? <ProfileInfoRow icon={IdCard} label="Documento" value="Não informado" /> : null}
            {isHelperMode ? <ProfileInfoRow icon={Briefcase} label="Profissão" value={roleLabel} /> : null}
            <ProfileInfoRow icon={Globe2} label="Idioma" value={languageLabel} badge="Padrão" />

            <div className="hidden rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Bio</p>
              <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-700">{bio}</p>
            </div>
            <div className="hidden gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3">
                <Mail className="h-5 w-5 shrink-0 text-blue-600" />
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Email</p>
                  <p className="truncate text-sm font-bold text-slate-800">{email || 'Não informado'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3">
                <Phone className="h-5 w-5 shrink-0 text-blue-600" />
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Telefone</p>
                  <p className="truncate text-sm font-bold text-slate-800">{profile?.phone || 'Não informado'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 sm:col-span-2">
                <MapPin className="h-5 w-5 shrink-0 text-blue-600" />
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Localização</p>
                  <p className="truncate text-sm font-bold text-slate-800">{city || 'Não informada'}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center gap-4 rounded-[1.65rem] border border-blue-100/70 bg-gradient-to-r from-[#EEF4FF] to-white p-4 shadow-[0_16px_38px_rgba(37,99,255,0.08)]">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#2563FF] text-white shadow-[0_14px_28px_rgba(37,99,255,0.24)]">
            <ShieldCheck className="h-7 w-7" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-black text-[#0B1220]">Perfil verificado</h2>
            <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
              Complete suas informações e ganhe mais confiança de clientes.
            </p>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-2xl bg-white px-4 py-3 text-xs font-black text-[#2563FF] shadow-[0_10px_24px_rgba(15,23,42,0.06)]"
          >
            Verificar agora
          </button>
        </section>

        {isHelperMode ? (
          <>
            <section className="grid gap-3">
              <section className="rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-[0_14px_32px_rgba(15,23,42,0.05)]">
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

              <section className="rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-[0_14px_32px_rgba(15,23,42,0.05)]">
                <div className="mb-3 flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
                    <Home className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-sm font-black text-slate-950">Endere?o base do Helper</h2>
                    <p className="mt-0.5 text-xs font-medium text-slate-500">Refer?ncia usada para oportunidades pr?ximas.</p>
                  </div>
                </div>
                <div className="mb-4 space-y-2">
                  {helperBaseLabel ? (
                    <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900">
                      {helperBaseLabel}
                    </p>
                  ) : (
                    <p className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-900">
                      Endere?o base nao configurado.
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
              </section>
            </section>

            <HelperScorePanel
              collapsible
              defaultExpanded={false}
              className="rounded-[1.75rem] border border-slate-100 bg-white shadow-[0_18px_42px_rgba(15,23,42,0.06)]"
            />
          </>
        ) : null}

      </div>
    </AppPageShell>
  );
}
