const APP_SHELL_PREFIXES = [
  '/client',
  '/helper',
  '/messages',
  '/ideas',
  '/notifications',
  '/payments',
  '/settings',
  '/map',
] as const;

/** True when the main app chrome (nav, notifications) should treat the user as “in session”. */
export function isAppShellPath(pathname: string): boolean {
  return APP_SHELL_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function isHelperArea(pathname: string): boolean {
  return pathname === '/helper' || pathname.startsWith('/helper/');
}

export function isClientArea(pathname: string): boolean {
  return pathname === '/client' || pathname.startsWith('/client/');
}

/** Routes that clearly belong to helper or client shells; neutral pages return null */
export function pathImpliesAppMode(pathname: string): 'client' | 'helper' | null {
  if (isHelperArea(pathname)) return 'helper';
  if (isClientArea(pathname)) return 'client';
  return null;
}
