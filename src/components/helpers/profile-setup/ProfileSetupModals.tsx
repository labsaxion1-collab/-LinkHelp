import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as Icons from 'lucide-react';
import { SERVICE_CATEGORIES } from '@/data/serviceCategories';
import { HiddenFileInput, useFileInputOpener } from '@/components/common/HiddenFileInput';
import type { HelperPortfolioPersist, PortfolioMediaItem } from '@/utils/helperPortfolioState';
import {
  buildPhotoItemFromFile,
  buildVideoItemFromFile,
  countFeatured,
  portfolioPhotos,
  portfolioVideos,
} from '@/utils/helperPortfolioState';
import { insertHelperPortfolioItem } from '@/services/supabase/portfolioRemote';
import {
  uploadPortfolioImageFile,
  uploadPortfolioThumbFromDataUrl,
  uploadPortfolioVideoFile,
} from '@/lib/storageUpload';
import {
  assertVideoDuration,
  captureVideoThumbnail,
  compressImageFileToDataUrl,
  imageToThumbDataUrl,
  MAX_VIDEO_SEC,
} from '@/utils/portfolioMediaProcessing';
import { contactGuardToastKey, detectContactInText } from '@/utils/portfolioContactGuard';
import { cropSquareAvatarFromFile } from '@/utils/portfolioMediaProcessing';
import {
  portfolioMaxFeatured,
  portfolioMaxPhotos,
  portfolioMaxVideos,
} from '@/utils/portfolioTierLimits';
import type { HelperSubscriptionTier } from '@/types/helperSubscription';
import type { VerificationStatus } from '@/utils/helperProfileSettings';

type TFn = (key: string, options?: Record<string, string | number>) => string;

function translateStorageError(e: unknown, t: TFn): string {
  const m = e instanceof Error ? e.message : String(e);
  if (m.includes('FILE_TOO_LARGE')) return t('profile_setup.file_too_large');
  if (m === 'INVALID_IMAGE_TYPE' || m === 'INVALID_VIDEO_TYPE') return t('profile_setup.invalid_file_type');
  if (m === 'NO_SUPABASE') return t('profile_setup.upload_error');
  return t('profile_setup.upload_error');
}

function ModalChrome({
  title,
  subtitle,
  children,
  footer,
  betweenScrollAndFooter,
  onClose,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Pinned between scroll body and footer (e.g. selected skills strip). */
  betweenScrollAndFooter?: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl shadow-slate-900/10 overflow-hidden max-h-[90vh] flex flex-col ring-1 ring-slate-200/80"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-100 flex justify-between items-start gap-3 bg-gradient-to-br from-slate-50 to-white shrink-0">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h3>
            {subtitle ? <p className="text-sm text-slate-500 mt-1 leading-snug">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 shrink-0 transition-colors"
            aria-label="Close"
          >
            <Icons.X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1 min-h-0 overscroll-contain">{children}</div>
        {betweenScrollAndFooter ? (
          <div className="shrink-0 border-t border-slate-200/90 bg-white/90 backdrop-blur-md shadow-[0_-10px_28px_-12px_rgba(15,23,42,0.12)] px-5 pt-3 pb-2 z-10">
            {betweenScrollAndFooter}
          </div>
        ) : null}
        {footer ? <div className="p-5 border-t border-slate-100 bg-slate-50/80 shrink-0">{footer}</div> : null}
      </div>
    </div>
  );
}

export function AvatarProfileModal({
  open,
  onClose,
  initialPreview,
  onSave,
  t,
  onToast,
}: {
  open: boolean;
  onClose: () => void;
  initialPreview: string | null;
  onSave: (dataUrl: string) => void | Promise<void>;
  t: TFn;
  onToast: (msg: string) => void;
}) {
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(initialPreview);
  const [busy, setBusy] = useState(false);
  const openAvatarPicker = useFileInputOpener(avatarInputRef, busy);

  useEffect(() => {
    if (open) setPreview(initialPreview);
  }, [open, initialPreview]);

  if (!open) return null;

  const onPick = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    const nameHit = detectContactInText(file.name);
    if (nameHit) {
      onToast(t(contactGuardToastKey(nameHit)));
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await cropSquareAvatarFromFile(file);
      setPreview(dataUrl);
    } catch {
      onToast(t('profile_setup.avatar_error'));
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      await onSave(preview);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalChrome
      title={t('profile_setup.avatar_title')}
      subtitle={t('profile_setup.avatar_sub')}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2.5 text-slate-600 font-bold text-sm hover:text-slate-900">
            {t('common.cancel')}
          </button>
          <button
            type="button"
            disabled={!preview || busy}
            onClick={() => void save()}
            className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black disabled:opacity-40 min-h-[44px]"
          >
            {busy ? t('profile_setup.uploading') : t('profile_setup.save')}
          </button>
        </div>
      }
    >
      <HiddenFileInput
        ref={avatarInputRef}
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        disabled={busy}
        onFiles={(files) => void onPick(files)}
      />
      <div className="flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={openAvatarPicker}
          disabled={busy}
          className="relative w-32 h-32 rounded-full ring-4 ring-slate-100 overflow-hidden bg-slate-100 shadow-inner cursor-pointer block disabled:opacity-60"
        >
          {preview ? (
            <img src={preview} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400">
              <Icons.User className="w-12 h-12" />
            </div>
          )}
          {busy ? (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none">
              <Icons.Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          ) : null}
        </button>
        <p className="text-xs text-center text-slate-500 leading-relaxed max-w-sm">{t('profile_setup.avatar_hint')}</p>
        <button
          type="button"
          onClick={openAvatarPicker}
          disabled={busy}
          className="text-sm font-bold text-sky-700 hover:text-sky-900 cursor-pointer min-h-[44px] inline-flex items-center disabled:opacity-50"
        >
          {t('profile_setup.avatar_choose')}
        </button>
      </div>
    </ModalChrome>
  );
}

export function SkillsProfileModal({
  open,
  onClose,
  skillIds,
  onSave,
  t,
}: {
  open: boolean;
  onClose: () => void;
  skillIds: string[];
  onSave: (ids: string[]) => void;
  t: TFn;
}) {
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<Set<string>>(() => new Set(skillIds));

  useEffect(() => {
    if (open) setSelected(new Set(skillIds));
  }, [open, skillIds]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return SERVICE_CATEGORIES;
    return SERVICE_CATEGORIES.filter((c) => {
      const label = t(`categories.${c.id}`).toLowerCase();
      return c.id.includes(needle) || label.includes(needle);
    });
  }, [q, t]);

  const selectedOrdered = useMemo(
    () => SERVICE_CATEGORIES.filter((c) => selected.has(c.id)),
    [selected],
  );

  const selectedCount = selected.size;

  if (!open) return null;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const removeSkill = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const selectedStrip = (
    <div className="rounded-xl border border-sky-200/70 bg-gradient-to-br from-sky-50/80 via-white to-white px-3 py-3 shadow-sm space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mb-2.5">
        <h4 className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
          {t('profile_setup.skills_selected_title')}
        </h4>
        {selectedCount > 0 ? (
          <span className="text-[11px] font-bold text-sky-700 tabular-nums shrink-0">
            {t('profile_setup.skills_selected_count', { count: selectedCount })}
          </span>
        ) : null}
      </div>
      {selectedCount === 0 ? (
        <p className="text-sm text-slate-400 font-medium leading-snug py-1">{t('profile_setup.skills_selected_empty')}</p>
      ) : (
        <div className="flex flex-wrap gap-2 max-h-[28vh] overflow-y-auto overscroll-contain pr-0.5 -mr-0.5">
          {selectedOrdered.map((c) => (
            <span
              key={c.id}
              className="inline-flex items-center gap-1 pl-3 pr-1 py-1.5 rounded-full bg-sky-50 border border-sky-200/90 text-sky-950 text-xs font-bold shadow-sm animate-in fade-in zoom-in-95 duration-200"
            >
              <span className="truncate max-w-[11rem] sm:max-w-[14rem]">{t(`categories.${c.id}`)}</span>
              <button
                type="button"
                onClick={() => removeSkill(c.id)}
                className="p-1.5 rounded-full text-sky-600 hover:bg-sky-200/80 hover:text-sky-900 transition-colors duration-200 min-w-[32px] min-h-[32px] flex items-center justify-center shrink-0"
                aria-label={t('profile_setup.skills_remove_aria', { name: t(`categories.${c.id}`) })}
              >
                <Icons.X className="w-3.5 h-3.5" strokeWidth={2.5} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <ModalChrome
      title={t('profile_setup.skills_title')}
      subtitle={t('profile_setup.skills_sub')}
      onClose={onClose}
      betweenScrollAndFooter={selectedStrip}
      footer={
        <div className="flex justify-end gap-2 flex-wrap">
          <button type="button" onClick={onClose} className="px-4 py-2.5 text-slate-600 font-bold text-sm min-h-[44px]">
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={() => {
              onSave(Array.from(selected));
              onClose();
            }}
            className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black min-h-[44px] transition-transform duration-200 active:scale-[0.98]"
          >
            {t('profile_setup.save')}
          </button>
        </div>
      }
    >
      <div className="relative mb-4">
        <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('profile_setup.skills_search')}
          className="w-full pl-10 pr-3 py-3 min-h-[48px] rounded-xl border border-slate-200 text-base sm:text-sm font-medium focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400 outline-none transition-shadow duration-200"
        />
      </div>

      <p className="text-[10px] font-black uppercase tracking-wide text-slate-400 mb-2">{t('profile_setup.skills_available_label')}</p>

      <div className="flex flex-wrap gap-2">
        {filtered.map((c) => {
          const on = selected.has(c.id);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => toggle(c.id)}
              className={`px-3 py-2.5 rounded-xl text-xs font-bold border min-h-[44px] transition-all duration-200 ease-out active:scale-[0.97] ${
                on
                  ? 'border-sky-500 bg-sky-50 text-sky-900 shadow-sm ring-1 ring-sky-500/20'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50/80'
              }`}
            >
              {on ? <Icons.Check className="inline w-3.5 h-3.5 mr-1 -mt-0.5 transition-transform duration-200" /> : null}
              {t(`categories.${c.id}`)}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-slate-400 mt-4 leading-relaxed">{t('profile_setup.skills_footer')}</p>
    </ModalChrome>
  );
}

export function PortfolioUploadModal({
  open,
  onClose,
  kind,
  tier,
  portfolio,
  onAdd,
  t,
  onToast,
  helperUserId,
  uploadToSupabase = false,
}: {
  open: boolean;
  onClose: () => void;
  kind: 'photo' | 'video';
  tier: HelperSubscriptionTier;
  portfolio: HelperPortfolioPersist;
  onAdd: (item: PortfolioMediaItem) => void;
  t: TFn;
  onToast: (msg: string) => void;
  /** When `uploadToSupabase`, portfolio row + storage use this profile id. */
  helperUserId: string | null;
  uploadToSupabase?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [skillId, setSkillId] = useState<string>('');
  const [featured, setFeatured] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setPhotoPreviewUrl(null);
      setVideoPreviewUrl(null);
      setCaption('');
      setSkillId('');
      setFeatured(false);
      setBusy(false);
    }
  }, [open]);

  useEffect(() => {
    if (!file || kind !== 'photo') {
      setPhotoPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPhotoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file, kind]);

  useEffect(() => {
    if (!file || kind !== 'video') {
      setVideoPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setVideoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file, kind]);

  if (!open) return null;

  const maxP = portfolioMaxPhotos(tier);
  const maxV = portfolioMaxVideos(tier);
  const maxF = portfolioMaxFeatured(tier);
  const nPhotos = portfolioPhotos(portfolio).length;
  const nVideos = portfolioVideos(portfolio).length;
  const atPhotoCap = kind === 'photo' && nPhotos >= maxP;
  const atVideoCap = kind === 'video' && nVideos >= maxV;

  const acceptPhoto = 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp';
  const acceptVideo = 'video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm';
  const accept = kind === 'photo' ? acceptPhoto : acceptVideo;
  const pickDisabled = atPhotoCap || atVideoCap || busy;
  const openFilePicker = useFileInputOpener(fileInputRef, pickDisabled);

  const onFile = async (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    const rn = detectContactInText(f.name);
    if (rn) {
      onToast(t(contactGuardToastKey(rn)));
      return;
    }
    if (kind === 'video') {
      try {
        await assertVideoDuration(f, MAX_VIDEO_SEC);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : '';
        if (msg === 'VIDEO_TOO_LONG') onToast(t('profile_setup.video_too_long'));
        else onToast(t('profile_setup.video_invalid'));
        return;
      }
    }
    setFile(f);
  };

  const submit = async () => {
    if (!file || atPhotoCap || atVideoCap) return;
    const capHit = detectContactInText(caption);
    if (capHit) {
      onToast(t(contactGuardToastKey(capHit)));
      return;
    }
    if (featured && countFeatured(portfolio) >= maxF) {
      onToast(t('profile_setup.featured_cap', { count: maxF }));
      return;
    }
    const meta = {
      caption: caption.trim() || undefined,
      skillId: skillId || undefined,
      featured: featured || undefined,
    };

    setBusy(true);
    try {
      const remote = uploadToSupabase && helperUserId;
      if (remote) {
        if (kind === 'photo') {
          const { path, publicUrl } = await uploadPortfolioImageFile(helperUserId, file);
          const full = await compressImageFileToDataUrl(file);
          const thumb = await imageToThumbDataUrl(full);
          const rowId = await insertHelperPortfolioItem({
            helper_id: helperUserId,
            type: 'image',
            url: publicUrl,
            storage_path: path,
            caption: meta.caption ?? null,
            skill_id: meta.skillId ?? null,
            featured: Boolean(meta.featured),
            thumb_url: publicUrl,
          });
          const item: PortfolioMediaItem = {
            id: rowId,
            kind: 'photo',
            fileName: file.name,
            caption: meta.caption,
            skillId: meta.skillId,
            featured: meta.featured,
            addedAt: Date.now(),
            thumbDataUrl: thumb,
            publicUrl,
            storagePath: path,
          };
          onAdd(item);
        } else {
          const durationSec = await assertVideoDuration(file, MAX_VIDEO_SEC);
          const thumbDataUrl = await captureVideoThumbnail(file);
          const { path, publicUrl } = await uploadPortfolioVideoFile(helperUserId, file);
          const { publicUrl: thumbPublicUrl } = await uploadPortfolioThumbFromDataUrl(helperUserId, thumbDataUrl);
          const rowId = await insertHelperPortfolioItem({
            helper_id: helperUserId,
            type: 'video',
            url: publicUrl,
            storage_path: path,
            caption: meta.caption ?? null,
            skill_id: meta.skillId ?? null,
            featured: Boolean(meta.featured),
            duration_sec: durationSec,
            thumb_url: thumbPublicUrl,
          });
          const item: PortfolioMediaItem = {
            id: rowId,
            kind: 'video',
            fileName: file.name,
            caption: meta.caption,
            skillId: meta.skillId,
            featured: meta.featured,
            addedAt: Date.now(),
            thumbDataUrl: thumbPublicUrl,
            durationSec: Math.round(durationSec * 10) / 10,
            publicUrl,
            storagePath: path,
          };
          onAdd(item);
        }
        onToast(t('profile_setup.upload_success'));
        onClose();
      } else {
        const item =
          kind === 'photo'
            ? await buildPhotoItemFromFile(file, meta)
            : await buildVideoItemFromFile(file, meta);
        onAdd(item);
        onClose();
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      if (msg === 'VIDEO_TOO_LONG') onToast(t('profile_setup.video_too_long'));
      else if (msg === 'VIDEO_LOAD' || msg === 'INVALID_VIDEO') onToast(t('profile_setup.video_invalid'));
      else onToast(translateStorageError(e, t));
    } finally {
      setBusy(false);
    }
  };

  const dropClass =
    'w-full min-h-[120px] rounded-xl border-2 border-dashed border-slate-200 hover:border-sky-300 hover:bg-sky-50/40 transition-colors flex flex-col items-center justify-center gap-2 mb-4 cursor-pointer';

  return (
    <ModalChrome
      title={kind === 'photo' ? t('profile_setup.portfolio_photo_title') : t('profile_setup.portfolio_video_title')}
      subtitle={kind === 'photo' ? t('profile_setup.portfolio_photo_sub') : t('profile_setup.portfolio_video_sub')}
      onClose={onClose}
      footer={
        <div className="flex flex-col sm:flex-row justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2.5 text-slate-600 font-bold text-sm order-2 sm:order-1">
            {t('common.cancel')}
          </button>
          <button
            type="button"
            disabled={!file || busy || atPhotoCap || atVideoCap}
            onClick={() => void submit()}
            className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black disabled:opacity-40 min-h-[44px] order-1 sm:order-2"
          >
            {busy ? t('profile_setup.uploading') : t('profile_setup.add_to_portfolio')}
          </button>
        </div>
      }
    >
      <HiddenFileInput
        ref={fileInputRef}
        accept={accept}
        disabled={pickDisabled}
        onFiles={(files) => void onFile(files)}
      />

      {(atPhotoCap || atVideoCap) && (
        <div className="mb-4 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 text-xs font-medium text-amber-950">
          {t('profile_setup.cap_reached', { kind: kind === 'photo' ? t('profile_setup.kind_photos') : t('profile_setup.kind_videos') })}
        </div>
      )}

      <button
        type="button"
        onClick={openFilePicker}
        disabled={pickDisabled}
        className={`${dropClass} ${pickDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {kind === 'photo' && photoPreviewUrl ? (
          <img src={photoPreviewUrl} alt="" className="max-h-40 rounded-lg object-contain pointer-events-none" />
        ) : kind === 'video' && videoPreviewUrl ? (
          <span className="text-sm font-semibold text-slate-600">{t('profile_setup.tap_to_change_file')}</span>
        ) : (
          <>
            {kind === 'photo' ? <Icons.ImagePlus className="w-10 h-10 text-slate-400" /> : <Icons.Clapperboard className="w-10 h-10 text-slate-400" />}
            <span className="text-sm font-bold text-slate-700">{t('profile_setup.tap_to_upload')}</span>
            <span className="text-[11px] text-slate-500">{kind === 'video' ? t('profile_setup.video_duration_hint') : ''}</span>
          </>
        )}
      </button>

      {kind === 'video' && videoPreviewUrl ? (
        <video
          src={videoPreviewUrl}
          className="mb-4 max-h-48 w-full max-w-sm mx-auto rounded-lg border border-slate-200"
          controls
          muted
          playsInline
          preload="metadata"
        />
      ) : null}

      {file ? (
        <div className="space-y-3">
          <label className="block">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{t('profile_setup.caption_label')}</span>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500/30 outline-none"
              placeholder={t('profile_setup.caption_placeholder')}
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{t('profile_setup.skill_label')}</span>
            <select
              value={skillId}
              onChange={(e) => setSkillId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium bg-white"
            >
              <option value="">{t('profile_setup.skill_optional')}</option>
              {SERVICE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {t(`categories.${c.id}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-slate-100 bg-slate-50/80 p-3">
            <input
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
              className="mt-1 rounded border-slate-300"
            />
            <span>
              <span className="text-sm font-bold text-slate-800 block">{t('profile_setup.featured_label')}</span>
              <span className="text-[11px] text-slate-500">{t('profile_setup.featured_hint', { count: maxF })}</span>
            </span>
          </label>
        </div>
      ) : null}
    </ModalChrome>
  );
}

export function ReviewsExplainerModal({
  open,
  onClose,
  reviewCount,
  t,
}: {
  open: boolean;
  onClose: () => void;
  reviewCount: number;
  t: TFn;
}) {
  if (!open) return null;
  const progress = Math.min(100, Math.round((Math.min(reviewCount, 5) / 5) * 100));
  return (
    <ModalChrome title={t('profile_setup.reviews_title')} subtitle={t('profile_setup.reviews_sub')} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-slate-600 leading-relaxed">{t('profile_setup.reviews_body')}</p>
        <div>
          <div className="flex justify-between text-[11px] font-bold text-slate-500 mb-1">
            <span>{t('profile_setup.reviews_progress_label')}</span>
            <span>{reviewCount}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">{t('profile_setup.reviews_ranking')}</p>
      </div>
    </ModalChrome>
  );
}

export function VerificationExplainerModal({
  open,
  onClose,
  status,
  onStart,
  onDemoVerified,
  t,
}: {
  open: boolean;
  onClose: () => void;
  status: VerificationStatus;
  onStart: () => void;
  onDemoVerified: () => void;
  t: TFn;
}) {
  if (!open) return null;
  return (
    <ModalChrome
      title={t('profile_setup.verify_title')}
      subtitle={t('profile_setup.verify_sub')}
      onClose={onClose}
      footer={
        status === 'none' ? (
          <div className="flex justify-end gap-2 flex-wrap">
            <button type="button" onClick={onClose} className="px-4 py-2.5 text-slate-600 font-bold text-sm">
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={() => {
                onStart();
              }}
              className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold min-h-[44px]"
            >
              {t('profile_setup.verify_start')}
            </button>
          </div>
        ) : status === 'pending' ? (
          <div className="flex justify-end gap-2 flex-wrap items-center">
            <p className="text-xs text-slate-500 flex-1 min-w-[140px]">{t('profile_setup.verify_pending_note')}</p>
            <button type="button" onClick={onDemoVerified} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold">
              {t('profile_setup.verify_demo_complete')}
            </button>
          </div>
        ) : (
          <div className="flex justify-end">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold">
              {t('common.close')}
            </button>
          </div>
        )
      }
    >
      <ul className="space-y-3 text-sm text-slate-600">
        <li className="flex gap-2">
          <Icons.Check className="w-5 h-5 text-emerald-500 shrink-0" />
          {t('profile_setup.verify_point_1')}
        </li>
        <li className="flex gap-2">
          <Icons.Check className="w-5 h-5 text-emerald-500 shrink-0" />
          {t('profile_setup.verify_point_2')}
        </li>
        <li className="flex gap-2">
          <Icons.Check className="w-5 h-5 text-emerald-500 shrink-0" />
          {t('profile_setup.verify_point_3')}
        </li>
      </ul>
      {status === 'verified' ? (
        <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-900 flex items-center gap-2">
          <Icons.ShieldCheck className="w-5 h-5" />
          {t('profile_setup.verify_done')}
        </div>
      ) : null}
    </ModalChrome>
  );
}
