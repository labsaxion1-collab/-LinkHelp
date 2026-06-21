import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Icons from 'lucide-react';
import { SERVICE_CATEGORIES } from '@/data/serviceCategories';
export { SkillsProfileModal } from './SkillsProfileModal';
import { FilePickerLabel, FilePickerZone } from '@/components/common/HiddenFileInput';
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
import { logMediaPicker } from '@/utils/mediaPickerDebug';
import { SimpleAvatarUploadModal, type AvatarUploadDraft } from './SimpleAvatarUploadModal';
import { useLanguage } from '@/context/LanguageContext';

export { SimpleAvatarUploadModal, type AvatarUploadDraft } from './SimpleAvatarUploadModal';
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
  closeOnBackdrop = true,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Pinned between scroll body and footer (e.g. selected skills strip). */
  betweenScrollAndFooter?: React.ReactNode;
  onClose: () => void;
  closeOnBackdrop?: boolean;
}) {
  const { t } = useLanguage();
  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={closeOnBackdrop ? onClose : undefined}
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
            aria-label={t('common.close')}
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

/** @deprecated Use SimpleAvatarUploadModal with parent-held draft state. */
export function AvatarProfileModal({
  open,
  draft,
  onDraftChange,
  onClose,
  initialPreview,
  onSave,
  t,
  onToast,
}: {
  open: boolean;
  draft: AvatarUploadDraft | null;
  onDraftChange: (draft: AvatarUploadDraft | null) => void;
  onClose: () => void;
  initialPreview: string | null;
  onSave: (file: File) => void | Promise<void>;
  t: TFn;
  onToast: (msg: string) => void;
}) {
  if (!open) return null;
  return (
    <SimpleAvatarUploadModal
      draft={draft}
      onDraftChange={onDraftChange}
      onClose={onClose}
      initialPreview={initialPreview}
      onSave={onSave}
      t={t}
      onToast={onToast}
    />
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
  const [file, setFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [skillId, setSkillId] = useState<string>('');
  const [featured, setFeatured] = useState(false);
  const [busy, setBusy] = useState(false);
  const [videoValid, setVideoValid] = useState(kind !== 'video');
  const previewObjectUrlRef = useRef<string | null>(null);
  const fileRef = useRef<File | null>(null);

  const revokePreviewObjectUrl = useCallback(() => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
    setPhotoPreviewUrl(null);
    setVideoPreviewUrl(null);
  }, []);

  useEffect(() => {
    console.log('[media-picker] PortfolioUploadModal', kind, open ? 'OPEN' : 'CLOSED');
    if (!open) {
      revokePreviewObjectUrl();
      setFile(null);
      fileRef.current = null;
      setCaption('');
      setSkillId('');
      setFeatured(false);
      setBusy(false);
      setVideoValid(kind !== 'video');
    }
  }, [open, kind, revokePreviewObjectUrl]);

  useEffect(() => {
    console.log('[media-picker] RENDER', {
      kind,
      open,
      file: file?.name ?? null,
      photoPreviewUrl: photoPreviewUrl ? 'blob' : null,
      videoPreviewUrl: videoPreviewUrl ? 'blob' : null,
    });
  });

  useEffect(() => () => revokePreviewObjectUrl(), [revokePreviewObjectUrl]);

  const applyPickedFile = useCallback(
    (f: File) => {
      console.log('[media-picker] SET_SELECTED_FILE', f.name);
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
        previewObjectUrlRef.current = null;
      }
      const url = URL.createObjectURL(f);
      previewObjectUrlRef.current = url;
      fileRef.current = f;
      setFile(f);
      if (kind === 'photo') {
        setPhotoPreviewUrl(url);
        setVideoPreviewUrl(null);
        setVideoValid(true);
      } else {
        setVideoPreviewUrl(url);
        setPhotoPreviewUrl(null);
      }
      logMediaPicker('PREVIEW CREATED', { kind, url, name: f.name });
    },
    [kind],
  );

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

  const onFile = (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    logMediaPicker('FILE SELECTED', { kind, name: f.name, type: f.type, size: f.size });
    const rn = detectContactInText(f.name);
    if (rn) {
      onToast(t(contactGuardToastKey(rn)));
      return;
    }
    if (kind === 'video') {
      applyPickedFile(f);
      setVideoValid(false);
      setBusy(true);
      void assertVideoDuration(f, MAX_VIDEO_SEC)
        .then(() => {
          setVideoValid(true);
          logMediaPicker('SAVE ENABLED');
        })
        .catch((e: unknown) => {
          const msg = e instanceof Error ? e.message : '';
          if (msg === 'VIDEO_TOO_LONG') onToast(t('profile_setup.video_too_long'));
          else onToast(t('profile_setup.video_invalid'));
          revokePreviewObjectUrl();
          fileRef.current = null;
          setFile(null);
          setVideoValid(false);
        })
        .finally(() => setBusy(false));
      return;
    }
    applyPickedFile(f);
  };

  const canAdd =
    file !== null && !busy && !atPhotoCap && !atVideoCap && (kind === 'photo' || videoValid);

  if (!open) return null;

  const submit = async () => {
    const uploadFile = fileRef.current ?? file;
    if (!uploadFile || atPhotoCap || atVideoCap) return;
    if (kind === 'video' && !videoValid) return;
    logMediaPicker('SAVE CLICKED', { kind, name: uploadFile.name });
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
      logMediaPicker('UPLOAD START', { kind, remote: Boolean(remote) });
      if (remote) {
        if (kind === 'photo') {
          const { path, publicUrl } = await uploadPortfolioImageFile(helperUserId, uploadFile);
          const full = await compressImageFileToDataUrl(uploadFile);
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
          logMediaPicker('PORTFOLIO ITEM CREATED', { id: rowId, kind: 'photo' });
        } else {
          const durationSec = await assertVideoDuration(uploadFile, MAX_VIDEO_SEC);
          const thumbDataUrl = await captureVideoThumbnail(uploadFile);
          const { path, publicUrl } = await uploadPortfolioVideoFile(helperUserId, uploadFile);
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
            fileName: uploadFile.name,
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
          logMediaPicker('PORTFOLIO ITEM CREATED', { id: rowId, kind: 'video' });
        }
        logMediaPicker('UPLOAD SUCCESS');
        onToast(t('profile_setup.upload_success'));
        onClose();
      } else {
        const item =
          kind === 'photo'
            ? await buildPhotoItemFromFile(uploadFile, meta)
            : await buildVideoItemFromFile(uploadFile, meta);
        onAdd(item);
        logMediaPicker('PORTFOLIO ITEM CREATED', { id: item.id, kind: item.kind });
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
      closeOnBackdrop={false}
      footer={
        <div className="flex flex-col sm:flex-row justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2.5 text-slate-600 font-bold text-sm order-2 sm:order-1">
            {t('common.cancel')}
          </button>
          <button
            type="button"
            disabled={!canAdd}
            onClick={() => void submit()}
            className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black disabled:opacity-40 min-h-[44px] order-1 sm:order-2"
          >
            {busy ? t('profile_setup.uploading') : t('profile_setup.add_to_portfolio')}
          </button>
        </div>
      }
    >
      {(atPhotoCap || atVideoCap) && (
        <div className="mb-4 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 text-xs font-medium text-amber-950">
          {t('profile_setup.cap_reached', { kind: kind === 'photo' ? t('profile_setup.kind_photos') : t('profile_setup.kind_videos') })}
        </div>
      )}

      <FilePickerZone
        accept={accept}
        disabled={pickDisabled}
        onFiles={(files) => void onFile(files)}
        className={pickDisabled ? 'opacity-50 cursor-not-allowed' : ''}
      >
        <div className={dropClass}>
          {kind === 'photo' && photoPreviewUrl ? (
            <img src={photoPreviewUrl} alt="" className="max-h-40 max-w-full rounded-lg object-contain pointer-events-none" />
          ) : kind === 'video' && videoPreviewUrl ? (
            <span className="text-sm font-semibold text-slate-600">{t('profile_setup.tap_to_change_file')}</span>
          ) : (
            <>
              {kind === 'photo' ? <Icons.ImagePlus className="w-10 h-10 text-slate-400" /> : <Icons.Clapperboard className="w-10 h-10 text-slate-400" />}
              <span className="text-sm font-bold text-slate-700">{t('profile_setup.tap_to_upload')}</span>
              <span className="text-[11px] text-slate-500">{kind === 'video' ? t('profile_setup.video_duration_hint') : ''}</span>
            </>
          )}
        </div>
      </FilePickerZone>

      {file ? (
        <p className="mb-3 text-xs font-semibold text-slate-600 truncate text-center" title={file.name}>
          {file.name}
        </p>
      ) : null}

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
