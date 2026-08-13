/**
 * Premium visual tokens for feed card DESCRIPTION / PROFILE panels (P3.3).
 * Visual-only — does not affect layout height, scroll, or FeedCardView logic.
 *
 * Solid navy only (no blur) for Android PWA performance.
 */
export const FEED_CARD_PREMIUM = {
  /** Mid navy — AA contrast with white text; not near-black. */
  bgSolid: '#234B72',
  bgAccent: '#254E7B',
  /** Top back bar — slightly darker than panel body. */
  topBar: '#1E3A5F',
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
  'absolute inset-0 flex flex-col overflow-hidden bg-[#234B72] shadow-[0_10px_28px_rgba(15,35,58,0.28)]';

/**
 * Fixed compact back bar (~48px). Absolute so scroll content passes underneath.
 * Solid darker navy (no glass blur) for PWA/Android safety.
 */
export const FEED_CARD_PREMIUM_TOP_BAR_CLASS =
  'absolute inset-x-0 top-0 z-20 flex h-12 shrink-0 items-center px-3 shadow-[0_1px_3px_rgba(8,20,36,0.28)] sm:px-4 bg-[#1E3A5F]';

export const FEED_CARD_PREMIUM_SCROLL_CLASS =
  'ios-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-2.5 pt-12 sm:px-4 sm:pb-3';

export const FEED_CARD_PREMIUM_BACK_CLASS =
  'inline-flex items-center gap-1.5 rounded-lg px-1 py-1 text-[12px] font-bold text-white/85 transition hover:bg-white/10 hover:text-white';

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

/** Compact capsule for Score. */
export const FEED_CARD_PREMIUM_SCORE_BADGE_CLASS =
  'inline-flex max-w-full items-center gap-1.5 rounded-full border border-sky-300/35 bg-sky-400/15 px-2.5 py-1 shadow-[0_2px_8px_rgba(15,35,58,0.14)]';

/** Compact capsule for overall rating. */
export const FEED_CARD_PREMIUM_RATING_BADGE_CLASS =
  'inline-flex max-w-full items-center gap-1 rounded-full border border-amber-300/35 bg-amber-400/15 px-2.5 py-1';

export const FEED_CARD_PREMIUM_LEVEL_BADGE_CLASS =
  'inline-flex items-center gap-1 rounded-full border border-amber-300/40 bg-amber-400/15 px-2 py-0.5 text-[11px] font-bold text-amber-100';

export const FEED_CARD_PREMIUM_CHIP_CLASS =
  'rounded-lg border border-white/15 bg-white/10 px-2 py-0.5 text-[11px] font-bold text-white/90';

export const FEED_CARD_PREMIUM_INPUT_CLASS =
  'w-full rounded-xl border border-white/25 bg-white/95 px-3 py-2 text-sm font-bold text-[#0F172A] outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-300/25';
