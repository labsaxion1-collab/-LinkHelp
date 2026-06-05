import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  Camera,
  Coins,
  Mail,
  MapPin,
  Phone,
  Settings,
  Star,
  UserRound,
} from 'lucide-react';
import { AppPageShell } from '@/components/design-system/AppPageShell';
import { DesktopBackButton } from '@/components/layout/DesktopBackButton';
import { useAuth } from '@/context/AuthContext';
import { useAppMode } from '@/context/AppModeContext';
import { useLanguage } from '@/context/LanguageContext';
import { useWalletBalance } from '@/hooks/useWalletBalance';
import { ROUTES } from '@/utils/constants';
import { formatLinkCredits } from '@/utils/formatLinkCredits';

function profileInitials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || 'LH';
  const parts = source.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? 'L';
  const second = parts.length > 1 ? parts[1]?.[0] : parts[0]?.[1];
  return `${first}${second ?? ''}`.toUpperCase();
}

export default function ProfilePage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { profile, session } = useAuth();
  const { isHelperMode } = useAppMode();
  const { balance, loading } = useWalletBalance();

  const email = session?.user.email ?? profile?.email ?? '';
  const displayName = profile?.name?.trim() || session?.user.user_metadata?.name || email || 'LinkHelp';
  const initials = profileInitials(displayName, email);
  const avatarUrl = profile?.avatar_url?.trim() || '';
  const city = [profile?.city, profile?.region].filter(Boolean).join(', ');
  const roleLabel = profile?.role === 'helper' ? 'Helper' : profile?.role === 'client' ? 'Cliente' : 'LinkHelp';
  const bio = profile?.bio?.trim() || 'Adicione uma bio em configurações para deixar seu perfil mais completo.';
  const balanceLabel = loading ? '...' : formatLinkCredits(balance ?? 0);
  const homeRoute = isHelperMode ? ROUTES.helperDashboard : ROUTES.clientDashboard;

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

        <section className="relative overflow-hidden rounded-[2rem] bg-[#071D48] p-5 text-white shadow-[0_24px_60px_rgba(8,31,84,0.24)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_0%,rgba(51,182,255,0.36),transparent_34%),linear-gradient(135deg,rgba(37,99,255,0.44),transparent_58%)]" />
          <div className="pointer-events-none absolute -right-12 -top-14 h-36 w-36 rounded-full bg-sky-300/20 blur-2xl" />

          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-100/75">Meu perfil</p>
              <h1 className="mt-2 truncate text-3xl font-black tracking-tight">{displayName}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1 text-xs font-black ring-1 ring-white/14">
                  <BadgeCheck className="h-3.5 w-3.5 text-sky-200" />
                  {roleLabel}
                </span>
                {profile?.rating != null && profile.rating > 0 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-300/14 px-3 py-1 text-xs font-black text-amber-200 ring-1 ring-amber-200/20">
                    <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
                    {profile.rating.toFixed(1)}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[1.6rem] bg-white/12 ring-2 ring-white/25">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl font-black text-white">
                  {initials}
                </div>
              )}
            </div>
          </div>

          {isHelperMode ? (
            <div className="relative mt-5 rounded-[1.5rem] bg-white/10 p-4 ring-1 ring-white/14">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-100/70">LinkCredit</p>
                  <p className="mt-1 text-2xl font-black text-amber-300 drop-shadow-[0_0_18px_rgba(251,191,36,0.22)]">
                    {balanceLabel}
                  </p>
                </div>
                <img src="/brand/linkcredit-coin-icon.png" alt="" className="h-14 w-14 rounded-full object-cover" />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link
                  to={ROUTES.helperLinkCredits}
                  className="flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-black text-blue-700"
                >
                  Pacotes
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  to={ROUTES.helperCredits}
                  className="flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-white/10 px-3 py-2 text-xs font-black text-white ring-1 ring-white/14"
                >
                  Carteira
                  <Coins className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ) : null}
        </section>

        <section className="rounded-[1.75rem] border border-slate-100 bg-white p-5 shadow-[0_18px_42px_rgba(15,23,42,0.06)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-950">Informações pessoais</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">Foto, bio e dados visíveis do seu perfil.</p>
            </div>
            <Link
              to={`${ROUTES.settings}#avatar`}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EEF3FF] text-[#2563FF]"
              aria-label="Editar foto"
            >
              <Camera className="h-5 w-5" />
            </Link>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Bio</p>
              <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-700">{bio}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
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

        <section className="grid gap-3 sm:grid-cols-2">
          <Link
            to={ROUTES.settings}
            className="flex items-center gap-3 rounded-[1.4rem] border border-slate-100 bg-white p-4 text-slate-900 shadow-[0_14px_32px_rgba(15,23,42,0.05)]"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-600">
              <Settings className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-black">Configurações</span>
              <span className="mt-0.5 block text-xs font-medium text-slate-500">Conta, idiomas e preferências.</span>
            </span>
          </Link>
          <Link
            to={homeRoute}
            className="flex items-center gap-3 rounded-[1.4rem] border border-slate-100 bg-white p-4 text-slate-900 shadow-[0_14px_32px_rgba(15,23,42,0.05)]"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF3FF] text-[#2563FF]">
              <UserRound className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-black">Voltar ao painel</span>
              <span className="mt-0.5 block text-xs font-medium text-slate-500">Retornar para sua área logada.</span>
            </span>
          </Link>
        </section>
      </div>
    </AppPageShell>
  );
}
