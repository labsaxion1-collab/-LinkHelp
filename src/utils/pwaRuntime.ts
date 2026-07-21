export type StandaloneWindow = Pick<Window, 'matchMedia'> & {
  navigator: Navigator & { standalone?: boolean };
};

/** Installed PWA / Add to Home Screen (Android display-mode or iOS standalone). */
export function isPwaStandalone(win?: StandaloneWindow): boolean {
  if (typeof window === 'undefined' && !win) return false;
  const w = win ?? (window as StandaloneWindow);
  return (
    w.matchMedia('(display-mode: standalone)').matches ||
    w.navigator.standalone === true
  );
}
