import { useEffect, useState } from 'react';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

export type PublicProfileExtras = {
  spokenLanguages: string[];
  bio: string | null;
  city: string | null;
  region: string | null;
  /** City + region only (never street / postal / lat-lng). Prefers helper_base_* when present. */
  locationLabel: string | null;
  primaryCategory: string | null;
  secondaryCategories: string[];
  loading: boolean;
};

const EMPTY: Omit<PublicProfileExtras, 'loading'> = {
  spokenLanguages: [],
  bio: null,
  city: null,
  region: null,
  locationLabel: null,
  primaryCategory: null,
  secondaryCategories: [],
};

type ProfileExtrasRow = {
  spoken_languages: string[] | null;
  bio: string | null;
  city: string | null;
  region: string | null;
  helper_base_city: string | null;
  helper_base_province: string | null;
  primary_category: string | null;
  secondary_categories: string[] | null;
};

function mapRow(data: ProfileExtrasRow | null): Omit<PublicProfileExtras, 'loading'> {
  if (!data) return EMPTY;
  const city = (data.helper_base_city || data.city || '').trim() || null;
  const region = (data.helper_base_province || data.region || '').trim() || null;
  const rawLangs = data.spoken_languages;
  const rawSecondary = data.secondary_categories;
  return {
    spokenLanguages: Array.isArray(rawLangs) ? rawLangs.filter(Boolean) : [],
    bio: data.bio?.trim() || null,
    city,
    region,
    locationLabel: [city, region].filter(Boolean).join(', ') || null,
    primaryCategory: data.primary_category?.trim() || null,
    secondaryCategories: Array.isArray(rawSecondary) ? rawSecondary.filter(Boolean) : [],
  };
}

/**
 * Read-only public-safe profile fields for Client/Helper public sheets.
 * Does not select email, phone, street address, postal, or coordinates.
 */
export function usePublicProfileExtras(userId: string | null | undefined, enabled = true): PublicProfileExtras {
  const [extras, setExtras] = useState<Omit<PublicProfileExtras, 'loading'>>(EMPTY);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !userId || !isSupabaseConfigured()) {
      setExtras(EMPTY);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      try {
        const sb = getSupabase();
        const { data } = await sb
          .from('profiles')
          .select(
            'spoken_languages, bio, city, region, helper_base_city, helper_base_province, primary_category, secondary_categories',
          )
          .eq('id', userId)
          .maybeSingle();
        if (cancelled) return;
        setExtras(mapRow((data as ProfileExtrasRow | null) ?? null));
      } catch {
        if (!cancelled) setExtras(EMPTY);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, enabled]);

  return { ...extras, loading };
}
