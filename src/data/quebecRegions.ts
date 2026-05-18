/** Curated Québec cities for signup / profile autocomplete (label + structured fields). */
export type QuebecPlace = {
  label: string;
  city: string;
  province: string;
  country: string;
  lat: number;
  lng: number;
};

export const QUEBEC_PLACES: QuebecPlace[] = [
  { label: 'Montréal, QC', city: 'Montréal', province: 'QC', country: 'Canada', lat: 45.5017, lng: -73.5673 },
  { label: 'Québec City, QC', city: 'Québec', province: 'QC', country: 'Canada', lat: 46.8139, lng: -71.208 },
  { label: 'Laval, QC', city: 'Laval', province: 'QC', country: 'Canada', lat: 45.6066, lng: -73.7123 },
  { label: 'Gatineau, QC', city: 'Gatineau', province: 'QC', country: 'Canada', lat: 45.4765, lng: -75.7013 },
  { label: 'Longueuil, QC', city: 'Longueuil', province: 'QC', country: 'Canada', lat: 45.5312, lng: -73.5181 },
  { label: 'Sherbrooke, QC', city: 'Sherbrooke', province: 'QC', country: 'Canada', lat: 45.4042, lng: -71.8929 },
  { label: 'Trois-Rivières, QC', city: 'Trois-Rivières', province: 'QC', country: 'Canada', lat: 46.3432, lng: -72.543 },
  { label: 'Saguenay, QC', city: 'Saguenay', province: 'QC', country: 'Canada', lat: 48.4168, lng: -71.0687 },
  { label: 'Lévis, QC', city: 'Lévis', province: 'QC', country: 'Canada', lat: 46.7382, lng: -71.2465 },
  { label: 'Terrebonne, QC', city: 'Terrebonne', province: 'QC', country: 'Canada', lat: 45.7, lng: -73.647 },
  { label: 'Saint-Jean-sur-Richelieu, QC', city: 'Saint-Jean-sur-Richelieu', province: 'QC', country: 'Canada', lat: 45.3071, lng: -73.2626 },
  { label: 'Repentigny, QC', city: 'Repentigny', province: 'QC', country: 'Canada', lat: 45.742, lng: -73.45 },
  { label: 'Brossard, QC', city: 'Brossard', province: 'QC', country: 'Canada', lat: 45.4584, lng: -73.4629 },
  { label: 'Drummondville, QC', city: 'Drummondville', province: 'QC', country: 'Canada', lat: 45.8833, lng: -72.4833 },
  { label: 'Saint-Jérôme, QC', city: 'Saint-Jérôme', province: 'QC', country: 'Canada', lat: 45.7805, lng: -74.0036 },
  { label: 'Granby, QC', city: 'Granby', province: 'QC', country: 'Canada', lat: 45.4001, lng: -72.7324 },
  { label: 'Belœil, QC', city: 'Belœil', province: 'QC', country: 'Canada', lat: 45.568, lng: -73.2054 },
  { label: 'Saint-Hyacinthe, QC', city: 'Saint-Hyacinthe', province: 'QC', country: 'Canada', lat: 45.6308, lng: -72.9569 },
  { label: 'Shawinigan, QC', city: 'Shawinigan', province: 'QC', country: 'Canada', lat: 46.5668, lng: -72.7491 },
  { label: 'Rimouski, QC', city: 'Rimouski', province: 'QC', country: 'Canada', lat: 48.4488, lng: -68.5239 },
  { label: 'Victoriaville, QC', city: 'Victoriaville', province: 'QC', country: 'Canada', lat: 46.0561, lng: -71.9589 },
  { label: 'Rouyn-Noranda, QC', city: 'Rouyn-Noranda', province: 'QC', country: 'Canada', lat: 48.2438, lng: -79.0161 },
  { label: 'Val-d’Or, QC', city: 'Val-d’Or', province: 'QC', country: 'Canada', lat: 48.0987, lng: -77.7968 },
];

export function searchQuebecPlaces(query: string, limit = 8): QuebecPlace[] {
  const q = query.trim().toLowerCase();
  if (!q) return QUEBEC_PLACES.slice(0, limit);
  const scored = QUEBEC_PLACES.map((p) => {
    const hay = `${p.label} ${p.city}`.toLowerCase();
    const idx = hay.indexOf(q);
    const score = idx === 0 ? 0 : idx > 0 ? 1 + idx / 100 : 10;
    return { p, score };
  })
    .filter((x) => x.score < 10)
    .sort((a, b) => a.score - b.score);
  return scored.slice(0, limit).map((x) => x.p);
}
