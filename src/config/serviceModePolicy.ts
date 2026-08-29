/**
 * Mirrors pack 40 `lead_subcategory_service_mode_policies` for publish UX.
 * Authoritative enforcement remains on the server; this only guides the form.
 */

export type ServiceModePolicy = 'in_person_only' | 'remote_only' | 'both';

const REMOTE_ONLY = new Set([
  'translation:document',
  'design:logo_brand',
  'design:social_media',
  'design:ui_ux',
  'design:presentation',
  'design:photo_editing',
  'marketing:social_media',
  'marketing:seo',
  'marketing:paid_ads',
  'marketing:content',
  'marketing:email',
]);

const BOTH = new Set([
  'translation:government',
  'translation:immigration',
  'translation:school',
  'translation:college',
  'translation:consultation',
  'translation:interview',
  'tech:format',
  'tech:wifi',
  'tech:install',
  'tech:phone',
  'design:print',
  'marketing:branding',
  'other:other',
]);

export function getServiceModePolicy(
  categoryId: string | null | undefined,
  subcategoryId: string | null | undefined,
): ServiceModePolicy {
  const cat = (categoryId ?? '').trim();
  const sub = (subcategoryId ?? '').trim();
  if (!cat || !sub) return 'both';
  const key = `${cat}:${sub}`;
  if (REMOTE_ONLY.has(key)) return 'remote_only';
  if (BOTH.has(key)) return 'both';
  return 'in_person_only';
}

/** Modes the client may pick for this subcategory (empty = wait for subcategory). */
export function allowedServiceModes(
  categoryId: string | null | undefined,
  subcategoryId: string | null | undefined,
): Array<'remote' | 'in_person'> {
  const policy = getServiceModePolicy(categoryId, subcategoryId);
  if (policy === 'remote_only') return ['remote'];
  if (policy === 'in_person_only') return ['in_person'];
  return ['remote', 'in_person'];
}
