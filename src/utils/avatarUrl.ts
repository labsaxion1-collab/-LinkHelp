export function initialsForName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
}

/** Deterministic avatar URLs (no third-party random image hosts that often block or 404). */
export function avatarUrlForName(name: string, background = 'e0e7ff', color = '1e293b'): string {
  const q = encodeURIComponent(name.trim() || '?');
  return `https://ui-avatars.com/api/?name=${q}&size=128&background=${background}&color=${color}&bold=true`;
}
