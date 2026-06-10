import * as Icons from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useCredits } from '@/context/CreditContext';
import { useWalletBalance } from '@/hooks/useWalletBalance';
import { HelperDashboardNav } from '@/components/helpers/HelperDashboardNav';
import { ROUTES } from '@/utils/constants';
import { UI_VISIBILITY } from '@/config/uiVisibility';
import { AppPageShell } from '@/components/design-system/AppPageShell';
import { formatLinkCredits, normalizeLinkCreditsAmount } from '@/utils/formatLinkCredits';
import { MOCK_CREDITS_USAGE } from '@/config/creditsUsageConfig';

/** Neon ring SVG — ~310° arc with glow, gap at bottom-right */
function NeonRing() {
  const r = 100;
  const cx = 110;
  const cy = 110;
  const circ = 2 * Math.PI * r; // ≈ 628
  const arcLen = circ * (310 / 360); // ≈ 541
  const gap = circ - arcLen; // ≈ 87

  return (
    <svg
      width="220"
      height="220"
      viewBox="0 0 220 220"
      className="absolute inset-0"
      aria-hidden
    >
      <defs>
        <filter id="neon-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="5" result="blur1" />
          <feGaussianBlur stdDeviation="10" result="blur2" />
          <feMerge>
            <feMergeNode in="blur2" />
            <feMergeNode in="blur1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="neon-glow-soft" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Dark track */}
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke="rgba(30,60,120,0.35)"
        strokeWidth="3"
      />

      {/* Outer glow arc */}
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke="rgba(59,130,246,0.45)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${arcLen} ${gap}`}
        transform={`rotate(-130 ${cx} ${cy})`}
        filter="url(#neon-glow)"
      />

      {/* Main neon arc */}
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke="#3B82F6"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray={`${arcLen} ${gap}`}
        transform={`rotate(-130 ${cx} ${cy})`}
        filter="url(#neon-glow-soft)"
      />

      {/* Bright highlight layer */}
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke="rgba(147,197,253,0.75)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray={`${arcLen} ${gap}`}
        transform={`rotate(-130 ${cx} ${cy})`}
      />
    </svg>
  );
}

/** 4-stat tile for the row below the hero */
function StatTile({
  icon: Icon,
  label,
  value,
  sub,
  iconColor,
  iconBg,
}: {
  icon: React.ElementType;
  label: string;
  value?: string;
  sub?: string;
  iconColor: string;
  iconBg: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.04] px-3 py-4 text-center backdrop-blur-sm">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </span>
      <p className="text-[10px] font-bold leading-tight text-slate-400">{label}</p>
      {value !== undefined && (
        <p className="text-lg font-black tabular-nums text-white">{value}</p>
      )}
      {sub && (
        <p className="text-[10px] font-medium leading-tight text-slate-500">{sub}</p>
      )}
    </div>
  );
}

export default function HelperCreditsPage() {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const { transactions, unlocks } = useCredits();
  const { balance, wallet, loading } = useWalletBalance();

  if (profile?.role !== 'helper') {
    return <Navigate to={ROUTES.clientDashboard} replace />;
  }

  const creditsUsed = wallet?.totalSpent ?? 0;
  const balanceNum = normalizeLinkCreditsAmount(balance ?? 0);
  const balanceDisplay = loading ? '…' : formatLinkCredits(balance ?? 0, language);

  return (
    <AppPageShell
      wide
      className="relative min-w-0 overflow-x-hidden bg-[#030B1A] px-0 pb-24 pt-0"
    >
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute -left-40 top-20 h-[28rem] w-[28rem] rounded-full bg-blue-700/10 blur-[100px]" />
      <div className="pointer-events-none absolute -right-32 top-[36rem] h-[22rem] w-[22rem] rounded-full bg-indigo-700/8 blur-[80px]" />

      <div className="relative mx-auto max-w-[1600px] px-4 sm:px-7">
        <HelperDashboardNav activeTab="match" onSelectFeedTab={() => {}} t={t} />

        <div className="mx-auto max-w-3xl space-y-4">

          {/* ── HERO CARD ─────────────────────────────── */}
          <div className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-gradient-to-br from-[#0A1628] via-[#071020] to-[#04091A] p-5 shadow-[0_24px_64px_rgba(0,0,0,0.5)]">
            {/* Subtle dot pattern top-right */}
            <div
              className="pointer-events-none absolute right-0 top-0 h-48 w-48 opacity-20"
              style={{
                backgroundImage:
                  'radial-gradient(circle, rgba(59,130,246,0.6) 1px, transparent 1px)',
                backgroundSize: '14px 14px',
                maskImage: 'radial-gradient(ellipse at top right, black 30%, transparent 70%)',
              }}
            />

            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">

              {/* Left — neon ring */}
              <div className="flex shrink-0 flex-col items-center">
                <div className="relative flex h-[220px] w-[220px] items-center justify-center">
                  <NeonRing />
                  {/* Center glow */}
                  <div className="absolute h-28 w-28 rounded-full bg-blue-600/10 blur-2xl" />
                  {/* Content */}
                  <div className="relative flex flex-col items-center text-center">
                    <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">
                      {t('helper_credits.hero_saldo_label')}
                    </p>
                    <div className="mt-1.5 flex items-baseline gap-1.5">
                      <span className="text-[3.2rem] font-black leading-none tabular-nums text-white drop-shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                        {loading ? '…' : balanceNum}
                      </span>
                      <span className="text-2xl font-black text-blue-300">LC</span>
                    </div>
                    {/* LinkCredits badge */}
                    <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-blue-700/50 bg-blue-950/60 px-3 py-1 text-[11px] font-bold text-blue-300 backdrop-blur-sm">
                      <Icons.Link2 className="h-3 w-3" />
                      LinkCredits
                    </span>
                  </div>
                </div>

                {/* Podium */}
                <div className="mx-auto -mt-2 h-5 w-32 rounded-t-[50%] bg-gradient-to-b from-[#1a3060]/80 to-[#0d1a38]/60 blur-[2px]" />
                <div className="mx-auto h-3 w-20 rounded-t-[50%] bg-gradient-to-b from-[#0f1e44]/60 to-transparent blur-[2px]" />
              </div>

              {/* Right — text */}
              <div className="flex-1 text-center sm:text-left">
                <h2 className="text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl">
                  {t('helper_credits.hero_tagline_1')}
                  <br />
                  <span className="text-blue-400">{t('helper_credits.hero_tagline_2')}</span>
                </h2>
                <p className="mt-4 max-w-xs text-sm font-medium leading-relaxed text-slate-400 sm:max-w-none">
                  {t('helper_credits.page_sub')}
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.06] px-5 py-2.5 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/[0.10]"
                  >
                    {t('helper_credits.hero_como_funciona')}
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600">
                      <Icons.Play className="h-3 w-3 fill-white text-white" />
                    </span>
                  </button>
                  <Link
                    to={ROUTES.helperLinkCredits}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-5 py-2.5 text-sm font-black text-white shadow-[0_4px_18px_rgba(59,130,246,0.4)] transition hover:bg-blue-400"
                  >
                    <Icons.ShoppingCart className="h-4 w-4" />
                    {t('helper_credits.insufficient_buy_linkcredits')}
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* ── 4 STAT TILES ─────────────────────────── */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile
              icon={Icons.Coins}
              label={t('helper_dashboard.credits_used_month')}
              value={`${creditsUsed} LC`}
              iconColor="text-blue-400"
              iconBg="bg-blue-500/15"
            />
            <StatTile
              icon={Icons.Target}
              label={t('helper_dashboard.unlocked_count')}
              value={String(unlocks.length)}
              iconColor="text-purple-400"
              iconBg="bg-purple-500/15"
            />
            <StatTile
              icon={Icons.RefreshCw}
              label={t('credits_usage.lc_returned')}
              value={`${MOCK_CREDITS_USAGE.lcReturned} LC`}
              iconColor="text-emerald-400"
              iconBg="bg-emerald-500/15"
            />
            <StatTile
              icon={Icons.ShieldCheck}
              label={t('helper_credits.stats_economize_title')}
              sub={t('helper_credits.stats_economize_sub')}
              iconColor="text-amber-400"
              iconBg="bg-amber-500/15"
            />
          </div>

          {/* ── BUY BANNER ───────────────────────────── */}
          {UI_VISIBILITY.helperCreditPurchase ? (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1032B4] via-[#0C1E8A] to-[#091868] shadow-[0_12px_40px_rgba(10,30,120,0.55)]">
              {/* Glow right */}
              <div className="pointer-events-none absolute -right-8 bottom-0 h-40 w-40 rounded-full bg-blue-500/25 blur-[40px]" />
              {/* Dot grid top-right */}
              <div
                className="pointer-events-none absolute right-0 top-0 h-full w-48 opacity-[0.18]"
                style={{
                  backgroundImage: 'radial-gradient(circle, rgba(147,197,253,0.9) 1px, transparent 1px)',
                  backgroundSize: '12px 12px',
                  maskImage: 'radial-gradient(ellipse at top right, black 5%, transparent 55%)',
                }}
              />

              <div className="relative flex min-h-0 items-center">
                {/* Left */}
                <div className="flex-1 py-4 pl-5 pr-2">
                  <h3 className="text-[15px] font-black leading-tight text-white">
                    {t('link_credits_store.buy_banner_title')}
                  </h3>
                  <p className="mt-0.5 text-[12px] font-medium leading-snug text-blue-200/75">
                    {t('link_credits_store.no_subscription')}
                  </p>
                  <Link
                    to={ROUTES.helperLinkCredits}
                    className="mt-3 inline-flex h-[36px] items-center gap-1.5 rounded-full bg-blue-500 px-4 text-[12px] font-black text-white shadow-[0_3px_14px_rgba(59,130,246,0.45),0_0_0_1px_rgba(59,130,246,0.25)] transition hover:bg-blue-400"
                  >
                    <Icons.ShoppingCart className="h-3.5 w-3.5" />
                    {t('helper_credits.insufficient_buy_linkcredits')}
                  </Link>
                </div>

                {/* Right — image clipped to show wallet body */}
                <div className="relative shrink-0 overflow-hidden" style={{ height: '140px', width: '160px' }}>
                  <img
                    src="/brand/wallet-illustration.png"
                    alt=""
                    aria-hidden
                    className="absolute right-0 w-auto object-contain"
                    style={{ mixBlendMode: 'screen', height: '220px', top: '-20px' }}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-blue-900/40 bg-blue-950/30 px-4 py-3 text-sm font-medium text-blue-300">
              {t('helper_credits.purchase_coming_soon')}
            </div>
          )}

          {/* ── HISTORY ──────────────────────────────── */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black text-white">{t('credits.history_title')}</h2>
              <button type="button" className="text-xs font-bold text-blue-400 hover:text-blue-300">
                {t('helper_dashboard.view_history')} →
              </button>
            </div>
            <div className="space-y-2">
              {transactions.length ? (
                transactions.slice(0, 20).map((tx) => (
                  <div
                    key={tx.id}
                    className="grid grid-cols-[1fr_auto] gap-3 rounded-xl border border-white/[0.05] bg-white/[0.03] px-4 py-3 transition hover:bg-white/[0.06]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-200">{tx.description}</p>
                      <p className="text-xs font-medium text-slate-500">
                        {new Date(tx.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-black ${tx.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
                      >
                        {tx.amount >= 0 ? '+' : ''}
                        {tx.amount}
                      </p>
                      <p className="text-[11px] font-bold text-slate-500">
                        {t('credits.balance_after', { count: tx.balanceAfter })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center">
                  <Icons.Inbox className="h-10 w-10 text-slate-600" />
                  <p className="text-sm font-bold text-slate-500">{t('credits.history_empty')}</p>
                  <p className="text-xs font-medium text-slate-600">
                    Quando você usar ou receber créditos, eles aparecerão aqui.
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </AppPageShell>
  );
}
