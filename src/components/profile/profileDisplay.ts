export function profileInitials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || 'LH';
  const parts = source.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? 'L';
  const second = parts.length > 1 ? parts[1]?.[0] : parts[0]?.[1];
  return `${first}${second ?? ''}`.toUpperCase();
}

export function formatProfileLocation(city?: string | null, region?: string | null): string | null {
  const parts = [city?.trim(), region?.trim()].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}
