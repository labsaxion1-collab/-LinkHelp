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
  /* Clip sticky header/body to the same rounded shell (matches apply/VIP radius). */
  'overflow-hidden',
].join(' ');

export const COMPACT_RANK_FULL_BLEED_CLASS =
  'lh-compact-rank-bleed relative isolate overflow-hidden';

/**
 * Horizontal breakout for the compact rank strip.
 * margin-inline uses the parent content box (50%) vs the viewport (50dvw),
 * so padding on AppPageShell/grid cannot shift the strip off-center.
 */
export function compactRankBleedMetrics(viewportWidth: number, parentContentWidth: number) {
  const marginInline = parentContentWidth / 2 - viewportWidth / 2;
  const parentInset = (viewportWidth - parentContentWidth) / 2;
  const left = parentInset + marginInline;
  const right = left + viewportWidth;
  return { marginInline, left, right, overflows: right > viewportWidth + 0.5 || left < -0.5 };
}
