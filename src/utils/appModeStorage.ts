export type AppMode = 'client' | 'helper';

export const STORAGE_APP_MODE = 'linkhelp_app_mode';
export const STORAGE_LAST_CLIENT = 'linkhelp_last_path_client';
export const STORAGE_LAST_HELPER = 'linkhelp_last_path_helper';

export function modeSwitchLog(label: string, payload: Record<string, unknown>): void {
  if (import.meta.env.DEV) {
    console.info(`[mode-switch] ${label}`, payload);
  }
}

export function readStoredAppMode(): AppMode {
  try {
    const v = localStorage.getItem(STORAGE_APP_MODE);
    if (v === 'helper' || v === 'client') return v;
  } catch {
    /* ignore */
  }
  return 'client';
}

export function writeStoredAppMode(mode: AppMode): void {
  try {
    localStorage.setItem(STORAGE_APP_MODE, mode);
  } catch {
    /* ignore */
  }
}

export function rememberPathForMode(mode: AppMode, path: string): void {
  try {
    if (mode === 'helper' && path.startsWith('/helper')) {
      localStorage.setItem(STORAGE_LAST_HELPER, path);
    }
    if (mode === 'client' && path.startsWith('/client')) {
      localStorage.setItem(STORAGE_LAST_CLIENT, path);
    }
  } catch {
    /* ignore */
  }
}

export function readLastPathForMode(mode: AppMode): string | null {
  try {
    const key = mode === 'helper' ? STORAGE_LAST_HELPER : STORAGE_LAST_CLIENT;
    const path = localStorage.getItem(key);
    if (!path) return null;
    if (mode === 'helper' && path.startsWith('/helper')) return path;
    if (mode === 'client' && path.startsWith('/client')) return path;
  } catch {
    /* ignore */
  }
  return null;
}
