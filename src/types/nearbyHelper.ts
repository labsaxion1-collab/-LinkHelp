import type { HelperPresenceStatus } from '@/components/ui/UserPresenceBadge';

export type NearbyHelper = {
  id: string;
  name: string;
  avatarUrl: string | null;
  rating: number | null;
  bio: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  skillIds: string[];
  latitude: number | null;
  longitude: number | null;
  onlineStatus: HelperPresenceStatus | null;
};

export type NearbyHelperMapPoint = NearbyHelper & {
  mapPosition: { lat: number; lng: number } | null;
  distanceKm: number | null;
  regionLabel: string;
};
