/** Deterministic avatar URLs (no third-party random image hosts that often block or 404). */
export function avatarUrlForName(name: string, background = 'e0e7ff', color = '1e293b'): string {
  const q = encodeURIComponent(name.trim() || '?');
  return `https://ui-avatars.com/api/?name=${q}&size=128&background=${background}&color=${color}&bold=true`;
}
