import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as Icons from 'lucide-react';
import { FilePickerLabel } from '@/components/common/HiddenFileInput';
import { detectContactInText, contactGuardToastKey } from '@/utils/portfolioContactGuard';
import { logMediaPicker } from '@/utils/mediaPickerDebug';

const AVATAR_ACCEPT = 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp';

type TFn = (key: string, options?: Record<string, string | number>) => string;

function ModalShell({
  title,
  subtitle,
  children,
  footer,
  onClose,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-sm animate-in fade-in duration-200"
      role="presentation"
    >
      <div
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col ring-1 ring-slate-200/80"
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
        {footer ? <div className="p-5 border-t border-slate-100 bg-slate-50/80 shrink-0">{footer}</div> : null}
      </div>
    </div>
  );
}

/** Minimal avatar picker — state resets only on cancel, success, or unmount. */
export function SimpleAvatarUploadModal({
  initialPreview,
  onClose,
  onSave,
  t,
  onToast,
}: {
  initialPreview: string | null;
  onClose: () => void;
  onSave: (file: File) => void | Promise<void>;
  t: TFn;
  onToast: (msg: string) => void;
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const objectUrlRef = useRef<string | null>(null);

  const resetState = useCallback((reason: string) => {
    console.warn('[media-picker] RESET AVATAR STATE', reason);
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setPreviewUrl(null);
    setSelectedFile(null);
    setBusy(false);
  }, []);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    console.log('[media-picker] RENDER', {
      selectedFile: selectedFile?.name ?? null,
      previewUrl: previewUrl ? 'blob' : null,
    });
  });

  const handleFileChange = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    console.log('[media-picker] FILE:', file);
    const nameHit = detectContactInText(file.name);
    if (nameHit) {
      onToast(t(contactGuardToastKey(nameHit)));
      return;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setSelectedFile(file);
    setPreviewUrl(url);
    console.log('[media-picker] SET_SELECTED_FILE', file.name);
    logMediaPicker('PREVIEW CREATED', url);
  };

  const handleCancel = () => {
    resetState('cancel');
    onClose();
  };

  const handleSave = async () => {
    if (!selectedFile) return;
    logMediaPicker('SAVE CLICKED');
    setBusy(true);
    try {
      logMediaPicker('UPLOAD START');
      await onSave(selectedFile);
      logMediaPicker('UPLOAD SUCCESS');
      resetState('success');
      onClose();
    } catch {
      onToast(t('profile_setup.avatar_save_error'));
    } finally {
      setBusy(false);
    }
  };

  const displayPreview = previewUrl ?? initialPreview;

  return (
    <ModalShell
      title={t('profile_setup.avatar_title')}
      subtitle={t('profile_setup.avatar_sub')}
      onClose={handleCancel}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={handleCancel} className="px-4 py-2.5 text-slate-600 font-bold text-sm hover:text-slate-900">
            {t('common.cancel')}
          </button>
          <button
            type="button"
            disabled={!selectedFile || busy}
            onClick={() => void handleSave()}
            className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black disabled:opacity-40 min-h-[44px]"
          >
            {busy ? t('profile_setup.uploading') : t('profile_setup.save')}
          </button>
        </div>
      }
    >
      <div className="flex flex-col items-center gap-4">
        <FilePickerLabel
          accept={AVATAR_ACCEPT}
          disabled={busy}
          onFiles={handleFileChange}
          className="w-32 h-32 rounded-full ring-4 ring-slate-100 overflow-hidden bg-slate-100 shadow-inner"
        >
          {displayPreview ? (
            <img src={displayPreview} alt="" className="w-full h-full object-cover pointer-events-none" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400 pointer-events-none">
              <Icons.User className="w-12 h-12" />
            </div>
          )}
          {busy ? (
            <div className="absolute inset-0 z-[70] bg-black/30 flex items-center justify-center pointer-events-none">
              <Icons.Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          ) : null}
        </FilePickerLabel>
        {selectedFile ? (
          <p className="text-xs font-semibold text-slate-600 truncate max-w-full px-2" title={selectedFile.name}>
            {selectedFile.name}
          </p>
        ) : null}
        <p className="text-xs text-center text-slate-500 leading-relaxed max-w-sm">{t('profile_setup.avatar_hint')}</p>
        <FilePickerLabel
          accept={AVATAR_ACCEPT}
          disabled={busy}
          onFiles={handleFileChange}
          className="text-sm font-bold text-sky-700 hover:text-sky-900 min-h-[44px] inline-flex items-center justify-center px-4"
        >
          {t('profile_setup.avatar_choose')}
        </FilePickerLabel>
      </div>
    </ModalShell>
  );
}
