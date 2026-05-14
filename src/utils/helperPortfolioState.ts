import {
  assertVideoDuration,
  captureVideoThumbnail,
  compressImageFileToDataUrl,
  imageToThumbDataUrl,
  MAX_VIDEO_SEC,
} from '@/utils/portfolioMediaProcessing';

export const HELPER_PORTFOLIO_STORAGE_KEY = 'linkhelp_helper_portfolio_v2';
const LEGACY_KEY = 'linkhelp_helper_portfolio_v1';

export interface PortfolioMediaItem {
  id: string;
  kind: 'photo' | 'video';
  fileName: string;
  caption?: string;
  /** Service category id e.g. cleaning, assembly */
  skillId?: string;
  featured?: boolean;
  addedAt: number;
  /** JPEG data URL — lightweight preview */
  thumbDataUrl?: string;
  durationSec?: number;
  /** Full photo stored as data URL for demo persistence (production: blob URLs + CDN) */
  fullImageDataUrl?: string;
}

export interface HelperPortfolioPersist {
  items: PortfolioMediaItem[];
  guideDismissed: boolean;
}

const emptyState = (): HelperPortfolioPersist => ({
  items: [],
  guideDismissed: false,
});

interface LegacyShape {
  photos?: { id: string; name: string; addedAt: number }[];
  videos?: { id: string; name: string; addedAt: number }[];
  guideDismissed?: boolean;
}

function migrateLegacy(raw: LegacyShape): HelperPortfolioPersist {
  const photos = (raw.photos ?? []).map((p) => ({
    id: p.id,
    kind: 'photo' as const,
    fileName: p.name,
    addedAt: p.addedAt,
  }));
  const videos = (raw.videos ?? []).map((v) => ({
    id: v.id,
    kind: 'video' as const,
    fileName: v.name,
    addedAt: v.addedAt,
  }));
  const items = [...photos, ...videos].sort((a, b) => a.addedAt - b.addedAt);
  return {
    items,
    guideDismissed: Boolean(raw.guideDismissed),
  };
}

export function loadHelperPortfolio(): HelperPortfolioPersist {
  try {
    const rawV2 = localStorage.getItem(HELPER_PORTFOLIO_STORAGE_KEY);
    if (rawV2) {
      const p = JSON.parse(rawV2) as Partial<HelperPortfolioPersist>;
      return {
        items: Array.isArray(p.items) ? p.items : [],
        guideDismissed: Boolean(p.guideDismissed),
      };
    }
    const rawLegacy = localStorage.getItem(LEGACY_KEY);
    if (rawLegacy) {
      const migrated = migrateLegacy(JSON.parse(rawLegacy) as LegacyShape);
      saveHelperPortfolio(migrated);
      return migrated;
    }
    return emptyState();
  } catch {
    return emptyState();
  }
}

export function saveHelperPortfolio(state: HelperPortfolioPersist): void {
  localStorage.setItem(HELPER_PORTFOLIO_STORAGE_KEY, JSON.stringify(state));
}

export function portfolioPhotos(p: HelperPortfolioPersist): PortfolioMediaItem[] {
  return p.items.filter((i) => i.kind === 'photo');
}

export function portfolioVideos(p: HelperPortfolioPersist): PortfolioMediaItem[] {
  return p.items.filter((i) => i.kind === 'video');
}

export function portfolioTotalItems(p: HelperPortfolioPersist): number {
  return p.items.length;
}

export function reorderPortfolioItems(state: HelperPortfolioPersist, orderedIds: string[]): HelperPortfolioPersist {
  const map = new Map(state.items.map((i) => [i.id, i]));
  const next: PortfolioMediaItem[] = [];
  for (const id of orderedIds) {
    const it = map.get(id);
    if (it) next.push(it);
  }
  for (const it of state.items) {
    if (!orderedIds.includes(it.id)) next.push(it);
  }
  return { ...state, items: next };
}

export function deletePortfolioItem(state: HelperPortfolioPersist, id: string): HelperPortfolioPersist {
  return { ...state, items: state.items.filter((i) => i.id !== id) };
}

export function updatePortfolioItem(
  state: HelperPortfolioPersist,
  id: string,
  patch: Partial<Pick<PortfolioMediaItem, 'caption' | 'skillId' | 'featured'>>,
): HelperPortfolioPersist {
  return {
    ...state,
    items: state.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
  };
}

export function countFeatured(state: HelperPortfolioPersist): number {
  return state.items.filter((i) => i.featured).length;
}

export async function buildPhotoItemFromFile(
  file: File,
  meta: { caption?: string; skillId?: string; featured?: boolean },
): Promise<PortfolioMediaItem> {
  const full = await compressImageFileToDataUrl(file);
  const thumb = await imageToThumbDataUrl(full);
  return {
    id: `ph_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    kind: 'photo',
    fileName: file.name,
    caption: meta.caption,
    skillId: meta.skillId,
    featured: meta.featured,
    addedAt: Date.now(),
    thumbDataUrl: thumb,
    fullImageDataUrl: full,
  };
}

export async function buildVideoItemFromFile(
  file: File,
  meta: { caption?: string; skillId?: string; featured?: boolean },
): Promise<PortfolioMediaItem> {
  const durationSec = await assertVideoDuration(file, MAX_VIDEO_SEC);
  const thumb = await captureVideoThumbnail(file);
  return {
    id: `vd_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    kind: 'video',
    fileName: file.name,
    caption: meta.caption,
    skillId: meta.skillId,
    featured: meta.featured,
    addedAt: Date.now(),
    thumbDataUrl: thumb,
    durationSec: Math.round(durationSec * 10) / 10,
  };
}
