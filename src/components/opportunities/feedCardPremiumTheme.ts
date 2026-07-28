/**
 * Premium visual tokens for feed card DESCRIPTION / PROFILE panels (P3.3).
 * Visual-only — does not affect layout height, scroll, or FeedCardView logic.
 *
 * Solid navy only (no blur / no translucent glass) for Android PWA performance.
 */
export const FEED_CARD_PREMIUM = {
  /** Mid navy — AA contrast with white text; not near-black. */
  bgSolid: '#234B72',
  bgAccent: '#254E7B',
  text: '#FFFFFF',
  textMuted: 'rgba(255,255,255,0.78)',
  textSoft: 'rgba(255,255,255,0.58)',
  iconLight: '#93C5FD',
  iconGold: '#FBBF24',
  iconWhite: '#FFFFFF',
  surface: 'rgba(255,255,255,0.10)',
  surfaceStrong: 'rgba(255,255,255,0.14)',
  border: 'rgba(255,255,255,0.16)',
  shadow: '0 10px 28px rgba(15, 35, 58, 0.28)',
} as const;

/** Shell behind DESCRIPTION/PROFILE — solid premium blue (PWA-safe). */
export const FEED_CARD_PREMIUM_SHELL_CLASS =
  'absolute inset-0 flex flex-col overflow-hidden bg-[#234B72] px-3 pb-2.5 pt-2.5 shadow-[0_10px_28px_rgba(15,35,58,0.28)] sm:px-4 sm:pb-3 sm:pt-3';

export const FEED_CARD_PREMIUM_BACK_CLASS =
  'mb-1.5 inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg px-1 py-1 text-[12px] font-bold text-white/80 transition hover:bg-white/10 hover:text-white';

export const FEED_CARD_PREMIUM_EYEBROW_CLASS =
  'shrink-0 text-[10px] font-black uppercase tracking-wide text-white/55';

export const FEED_CARD_PREMIUM_TITLE_CLASS =
  'mt-0.5 shrink-0 text-[15px] font-bold leading-snug text-white sm:text-[16px]';

export const FEED_CARD_PREMIUM_BODY_CLASS =
  'text-[13px] font-medium leading-relaxed text-white/80';

export const FEED_CARD_PREMIUM_MUTED_CLASS = 'text-[13px] font-medium text-white/55';

export const FEED_CARD_PREMIUM_SURFACE_CLASS =
  'space-y-1.5 rounded-xl border border-white/15 bg-white/10 px-2.5 py-2';

export const FEED_CARD_PREMIUM_QUOTE_NORMAL_CLASS =
  'rounded-xl border border-sky-300/30 bg-sky-400/15 px-2.5 py-2';

export const FEED_CARD_PREMIUM_QUOTE_VIP_CLASS =
  'rounded-xl border border-amber-300/35 bg-amber-400/15 px-2.5 py-2';

export const FEED_CARD_PREMIUM_ICON_WHITE_CLASS = 'h-3.5 w-3.5 shrink-0 text-white';
export const FEED_CARD_PREMIUM_ICON_LIGHT_CLASS = 'h-3.5 w-3.5 shrink-0 text-sky-300';
export const FEED_CARD_PREMIUM_ICON_GOLD_CLASS = 'h-3.5 w-3.5 shrink-0 text-amber-300';

export const FEED_CARD_PREMIUM_SCORE_BADGE_CLASS =
  'rounded-xl border border-sky-300/35 bg-gradient-to-br from-white/14 to-white/6 px-2.5 py-2 shadow-[0_4px_12px_rgba(15,35,58,0.18)]';

export const FEED_CARD_PREMIUM_LEVEL_BADGE_CLASS =
  'inline-flex items-center gap-1 rounded-full border border-amber-300/40 bg-amber-400/15 px-2 py-0.5 text-[11px] font-bold text-amber-100';

export const FEED_CARD_PREMIUM_CHIP_CLASS =
  'rounded-lg border border-white/15 bg-white/10 px-2 py-0.5 text-[11px] font-bold text-white/90';

export const FEED_CARD_PREMIUM_INPUT_CLASS =
  'w-full rounded-xl border border-white/25 bg-white/95 px-3 py-2 text-sm font-bold text-[#0F172A] outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-300/25';
