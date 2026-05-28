/** Light tap feedback on supported mobile browsers (ignored on desktop). */
export function hapticLight(): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(12);
  } catch {
    /* noop */
  }
}

export function hapticSuccess(): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate([10, 40, 14]);
  } catch {
    /* noop */
  }
}
