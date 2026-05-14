import React, { useState } from 'react';
import * as Icons from 'lucide-react';
import { SERVICE_CATEGORIES } from '@/data/serviceCategories';
import type { HelperPortfolioPersist, PortfolioMediaItem } from '@/utils/helperPortfolioState';
import {
  deletePortfolioItem,
  portfolioPhotos,
  portfolioVideos,
  reorderPortfolioItems,
  updatePortfolioItem,
  countFeatured,
} from '@/utils/helperPortfolioState';
import { contactGuardToastKey, detectContactInText } from '@/utils/portfolioContactGuard';
import { portfolioMaxFeatured } from '@/utils/portfolioTierLimits';
import type { HelperSubscriptionTier } from '@/types/helperSubscription';

type TFn = (key: string, options?: Record<string, string | number>) => string;

export function HelperPortfolioPanel({
  variant,
  portfolio,
  setPortfolio,
  tier,
  onOpenGuide,
  onAddPhoto,
  onAddVideo,
  t,
  onToast,
}: {
  variant: 'desktop' | 'mobile';
  portfolio: HelperPortfolioPersist;
  setPortfolio: React.Dispatch<React.SetStateAction<HelperPortfolioPersist>>;
  tier: HelperSubscriptionTier;
  onOpenGuide: () => void;
  onAddPhoto: () => void;
  onAddVideo: () => void;
  t: TFn;
  onToast: (msg: string) => void;
}) {
  const [editingCaptionId, setEditingCaptionId] = useState<string | null>(null);
  const [draftCaption, setDraftCaption] = useState('');
  const maxFeat = portfolioMaxFeatured(tier);
  const photos = portfolioPhotos(portfolio);
  const videos = portfolioVideos(portfolio);

  const move = (id: string, dir: -1 | 1) => {
    const ids = portfolio.items.map((i) => i.id);
    const idx = ids.indexOf(id);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= ids.length) return;
    const next = [...ids];
    [next[idx], next[j]] = [next[j], next[idx]];
    setPortfolio((prev) => reorderPortfolioItems(prev, next));
  };

  const remove = (id: string) => {
    setPortfolio((prev) => deletePortfolioItem(prev, id));
  };

  const patchItem = (id: string, patch: Partial<Pick<PortfolioMediaItem, 'caption' | 'skillId' | 'featured'>>) => {
    if (patch.caption !== undefined) {
      const hit = detectContactInText(patch.caption);
      if (hit) {
        onToast(t(contactGuardToastKey(hit)));
        return;
      }
    }
    if (patch.featured === true && countFeatured(portfolio) >= maxFeat) {
      const item = portfolio.items.find((i) => i.id === id);
      if (!item?.featured) {
        onToast(t('profile_setup.featured_cap', { count: maxFeat }));
        return;
      }
    }
    setPortfolio((prev) => updatePortfolioItem(prev, id, patch));
  };

  const startEditCaption = (item: PortfolioMediaItem) => {
    setEditingCaptionId(item.id);
    setDraftCaption(item.caption ?? '');
  };

  const commitCaption = (id: string) => {
    patchItem(id, { caption: draftCaption.trim() || undefined });
    setEditingCaptionId(null);
  };

  const btnGrid = variant === 'mobile' ? 'grid grid-cols-2 gap-2' : 'flex flex-col gap-2';
  const previewItems = portfolio.items.slice(0, 4);

  return (
    <>
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-wider text-sky-600/90">{t('portfolio_onboarding.section_title')}</p>
          <p className="text-sm font-bold text-slate-900 leading-snug">{t('portfolio_onboarding.section_sub')}</p>
        </div>
        <button
          type="button"
          onClick={onOpenGuide}
          className="shrink-0 text-[10px] font-black uppercase tracking-wide text-sky-800 bg-sky-100 hover:bg-sky-200 px-2.5 py-1.5 rounded-lg transition-colors"
        >
          {t('portfolio_onboarding.reopen_tips')}
        </button>
      </div>

      {previewItems.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-0.5 px-0.5 hide-scrollbar">
          {previewItems.map((item) => {
            const src = item.kind === 'photo' ? item.fullImageDataUrl || item.thumbDataUrl : item.thumbDataUrl;
            return (
              <div
                key={item.id}
                className="relative h-16 w-16 shrink-0 rounded-[var(--lh-radius-md)] overflow-hidden bg-slate-100 ring-1 ring-slate-200/80 shadow-sm"
              >
                {src ? <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" /> : null}
                {item.kind === 'video' ? (
                  <span className="absolute bottom-1 right-1 rounded bg-black/55 text-[8px] font-bold text-white px-1 py-px">▶</span>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      <div className={btnGrid}>
        <button
          type="button"
          onClick={onAddPhoto}
          className={
            variant === 'mobile'
              ? 'min-h-[48px] flex items-center justify-center gap-1.5 rounded-xl bg-sky-600 text-white text-xs font-black shadow-md px-2'
              : 'min-h-[48px] w-full flex items-center justify-center gap-2 rounded-xl bg-sky-600 text-white text-sm font-black shadow-md shadow-sky-500/20 hover:bg-sky-700 transition-colors'
          }
        >
          <Icons.ImagePlus className={variant === 'mobile' ? 'w-5 h-5 shrink-0' : 'w-6 h-6 shrink-0'} />
          <span className="truncate">{t('portfolio_onboarding.add_photo')}</span>
        </button>
        <button
          type="button"
          onClick={onAddVideo}
          className={
            variant === 'mobile'
              ? 'min-h-[48px] flex items-center justify-center gap-1.5 rounded-xl border-2 border-sky-200 bg-white text-sky-900 text-xs font-black px-2'
              : 'min-h-[48px] w-full flex items-center justify-center gap-2 rounded-xl border-2 border-sky-200 bg-white text-sky-900 text-sm font-black hover:bg-sky-50 transition-colors'
          }
        >
          <Icons.Clapperboard className={variant === 'mobile' ? 'w-5 h-5 shrink-0 text-sky-700' : 'w-6 h-6 shrink-0 text-sky-700'} />
          <span className="truncate">{t('portfolio_onboarding.add_video')}</span>
        </button>
      </div>

      {(photos.length > 0 || videos.length > 0) && (
        <div className="space-y-1">
          <p className="text-[11px] text-slate-500 font-semibold text-center">
            {t('portfolio_onboarding.count_photos', { count: photos.length })} · {t('portfolio_onboarding.count_videos', { count: videos.length })}
          </p>
          <p className="text-[11px] text-slate-600 font-medium text-center leading-snug px-1">{t('portfolio_onboarding.trust_short_line')}</p>
        </div>
      )}

      {portfolio.items.length > 0 ? (
        <div className="space-y-2 pt-1 border-t border-sky-100/80">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{t('profile_setup.manage_title')}</p>
          <ul className="space-y-2 max-h-[min(52vh,420px)] overflow-y-auto pr-0.5 hide-scrollbar">
            {portfolio.items.map((item, index) => {
              const src = item.kind === 'photo' ? item.fullImageDataUrl || item.thumbDataUrl : item.thumbDataUrl;
              return (
                <li
                  key={item.id}
                  className="rounded-xl border border-slate-200/90 bg-white p-2 shadow-sm flex gap-2 items-start"
                >
                  <div className="relative w-14 h-14 shrink-0 rounded-lg overflow-hidden bg-slate-100 ring-1 ring-slate-100">
                    {src ? <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" /> : null}
                    {item.kind === 'video' ? (
                      <span className="absolute bottom-0.5 right-0.5 rounded bg-black/60 text-[9px] font-bold text-white px-1">
                        {item.durationSec != null ? `${item.durationSec}s` : '▶'}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-[10px] font-black uppercase text-slate-400">{item.kind === 'photo' ? t('profile_setup.kind_photo') : t('profile_setup.kind_video')}</span>
                      {item.skillId ? (
                        <span className="text-[10px] font-bold text-sky-800 bg-sky-50 px-1.5 py-0.5 rounded-md">{t(`categories.${item.skillId}`)}</span>
                      ) : null}
                      {item.featured ? (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded-md">{t('profile_setup.featured_badge')}</span>
                      ) : null}
                    </div>
                    {editingCaptionId === item.id ? (
                      <div className="flex flex-col gap-1">
                        <textarea
                          value={draftCaption}
                          onChange={(e) => setDraftCaption(e.target.value)}
                          rows={2}
                          className="w-full text-xs rounded-lg border border-slate-200 px-2 py-1"
                        />
                        <div className="flex gap-2">
                          <button type="button" className="text-[11px] font-bold text-sky-700" onClick={() => commitCaption(item.id)}>
                            {t('common.save')}
                          </button>
                          <button type="button" className="text-[11px] text-slate-500" onClick={() => setEditingCaptionId(null)}>
                            {t('common.cancel')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button type="button" onClick={() => startEditCaption(item)} className="text-left w-full">
                        <p className="text-xs text-slate-700 line-clamp-2">{item.caption || t('profile_setup.tap_add_caption')}</p>
                      </button>
                    )}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <select
                        value={item.skillId ?? ''}
                        onChange={(e) => patchItem(item.id, { skillId: e.target.value || undefined })}
                        className="text-[10px] font-semibold rounded-lg border border-slate-200 px-1.5 py-1 bg-white max-w-[140px]"
                      >
                        <option value="">{t('profile_setup.skill_optional')}</option>
                        {SERVICE_CATEGORIES.map((c) => (
                          <option key={c.id} value={c.id}>
                            {t(`categories.${c.id}`)}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => patchItem(item.id, { featured: !item.featured })}
                        className={`p-1.5 rounded-lg border ${item.featured ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-400 hover:bg-slate-50'}`}
                        title={t('profile_setup.featured_label')}
                      >
                        <Icons.Star className={`w-3.5 h-3.5 ${item.featured ? 'fill-current' : ''}`} />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(item.id, -1)}
                        disabled={index === 0}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30"
                        aria-label="Move up"
                      >
                        <Icons.ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(item.id, 1)}
                        disabled={index === portfolio.items.length - 1}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30"
                        aria-label="Move down"
                      >
                        <Icons.ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(item.id)}
                        className="p-1.5 rounded-lg border border-red-100 text-red-600 hover:bg-red-50 ml-auto"
                        aria-label={t('common.delete')}
                      >
                        <Icons.Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </>
  );
}
