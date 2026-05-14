/** Curated Québec cities for signup / profile autocomplete (label + structured fields). */
export type QuebecPlace = {
  label: string;
  city: string;
  province: string;
  country: string;
};

export const QUEBEC_PLACES: QuebecPlace[] = [
  { label: 'Montréal, QC', city: 'Montréal', province: 'QC', country: 'Canada' },
  { label: 'Québec City, QC', city: 'Québec', province: 'QC', country: 'Canada' },
  { label: 'Laval, QC', city: 'Laval', province: 'QC', country: 'Canada' },
  { label: 'Gatineau, QC', city: 'Gatineau', province: 'QC', country: 'Canada' },
  { label: 'Longueuil, QC', city: 'Longueuil', province: 'QC', country: 'Canada' },
  { label: 'Sherbrooke, QC', city: 'Sherbrooke', province: 'QC', country: 'Canada' },
  { label: 'Trois-Rivières, QC', city: 'Trois-Rivières', province: 'QC', country: 'Canada' },
  { label: 'Saguenay, QC', city: 'Saguenay', province: 'QC', country: 'Canada' },
  { label: 'Lévis, QC', city: 'Lévis', province: 'QC', country: 'Canada' },
  { label: 'Terrebonne, QC', city: 'Terrebonne', province: 'QC', country: 'Canada' },
  { label: 'Saint-Jean-sur-Richelieu, QC', city: 'Saint-Jean-sur-Richelieu', province: 'QC', country: 'Canada' },
  { label: 'Repentigny, QC', city: 'Repentigny', province: 'QC', country: 'Canada' },
  { label: 'Brossard, QC', city: 'Brossard', province: 'QC', country: 'Canada' },
  { label: 'Drummondville, QC', city: 'Drummondville', province: 'QC', country: 'Canada' },
  { label: 'Saint-Jérôme, QC', city: 'Saint-Jérôme', province: 'QC', country: 'Canada' },
  { label: 'Granby, QC', city: 'Granby', province: 'QC', country: 'Canada' },
  { label: 'Belœil, QC', city: 'Belœil', province: 'QC', country: 'Canada' },
  { label: 'Saint-Hyacinthe, QC', city: 'Saint-Hyacinthe', province: 'QC', country: 'Canada' },
  { label: 'Shawinigan, QC', city: 'Shawinigan', province: 'QC', country: 'Canada' },
  { label: 'Rimouski, QC', city: 'Rimouski', province: 'QC', country: 'Canada' },
  { label: 'Victoriaville, QC', city: 'Victoriaville', province: 'QC', country: 'Canada' },
  { label: 'Rouyn-Noranda, QC', city: 'Rouyn-Noranda', province: 'QC', country: 'Canada' },
  { label: 'Val-d’Or, QC', city: 'Val-d’Or', province: 'QC', country: 'Canada' },
];

export function searchQuebecPlaces(query: string, limit = 8): QuebecPlace[] {
  const q = query.trim().toLowerCase();
  if (!q) return QUEBEC_PLACES.slice(0, limit);
  const scored = QUEBEC_PLACES.map((p) => {
    const hay = `${p.label} ${p.city}`.toLowerCase();
    const idx = hay.indexOf(q);
    const starts = p.city.toLowerCase().startsWith(q) || p.label.toLowerCase().startsWith(q);
    const score = idx === -1 ? 999 : starts ? idx : idx + 10;
    return { p, score };
  });
  return scored
    .filter((x) => x.score < 900)
    .sort((a, b) => a.score - b.score || a.p.label.localeCompare(b.p.label))
    .slice(0, limit)
    .map((x) => x.p);
}
