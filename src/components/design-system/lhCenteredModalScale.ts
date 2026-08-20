/**
 * Shared centered-modal scale.
 * Width tokens match HelperApplyConfirmModal (normal + VIP).
 * Description / Profile / candidates use the same width plus a minimum height
 * so short content still has the same on-screen presence.
 */
export const LH_CENTERED_MODAL_WIDTH_CLASS = 'w-[calc(100vw-32px)] max-w-[360px]';
export const LH_CENTERED_MODAL_MIN_HEIGHT_CLASS = 'min-h-[min(400px,80dvh)]';
export const LH_CENTERED_MODAL_MAX_HEIGHT_CLASS = 'max-h-[min(82dvh,720px)]';
export const LH_CENTERED_MODAL_RADIUS_CLASS = 'rounded-[22px]';
export const LH_CENTERED_MODAL_SHADOW_CLASS = 'shadow-[0_18px_48px_rgba(15,23,42,0.22)]';

export const LH_CENTERED_MODAL_APPLY_PANEL_CLASS = [
  'relative',
  LH_CENTERED_MODAL_WIDTH_CLASS,
  LH_CENTERED_MODAL_RADIUS_CLASS,
  LH_CENTERED_MODAL_SHADOW_CLASS,
].join(' ');

export const LH_CENTERED_MODAL_STANDARD_PANEL_CLASS = [
  'relative',
  LH_CENTERED_MODAL_WIDTH_CLASS,
  LH_CENTERED_MODAL_MIN_HEIGHT_CLASS,
  LH_CENTERED_MODAL_MAX_HEIGHT_CLASS,
  LH_CENTERED_MODAL_RADIUS_CLASS,
  LH_CENTERED_MODAL_SHADOW_CLASS,
].join(' ');

export const COMPACT_RANK_FULL_BLEED_CLASS =
  'lh-compact-rank-bleed relative left-1/2 isolate w-[100dvw] max-w-none -translate-x-1/2 overflow-hidden lg:left-auto lg:w-full lg:translate-x-0';
