import { useEffect, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
};

export function HelperTermsGateModal({ open, onClose, onConfirm, loading }: Props) {
  const { t } = useLanguage();
  const [c1, setC1] = useState(false);
  const [c2, setC2] = useState(false);
  const [c3, setC3] = useState(false);
  const [c4, setC4] = useState(false);

  useEffect(() => {
    if (open) {
      setC1(false);
      setC2(false);
      setC3(false);
      setC4(false);
    }
  }, [open]);

  if (!open) return null;

  const allOk = c1 && c2 && c3 && c4;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="helper-terms-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl border border-slate-100 p-6 sm:p-8 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 max-h-[90dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="helper-terms-title" className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
          {t('auth.helper_modal_title')}
        </h2>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">{t('auth.helper_modal_sub')}</p>

        <ul className="mt-6 space-y-4">
          <li>
            <label className="flex gap-3 cursor-pointer items-start text-sm text-slate-800 font-medium leading-snug">
              <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" checked={c1} onChange={(e) => setC1(e.target.checked)} />
              <span>{t('auth.helper_check_1')}</span>
            </label>
          </li>
          <li>
            <label className="flex gap-3 cursor-pointer items-start text-sm text-slate-800 font-medium leading-snug">
              <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" checked={c2} onChange={(e) => setC2(e.target.checked)} />
              <span>{t('auth.helper_check_2')}</span>
            </label>
          </li>
          <li>
            <label className="flex gap-3 cursor-pointer items-start text-sm text-slate-800 font-medium leading-snug">
              <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" checked={c3} onChange={(e) => setC3(e.target.checked)} />
              <span>{t('auth.helper_check_3')}</span>
            </label>
          </li>
          <li>
            <label className="flex gap-3 cursor-pointer items-start text-sm text-slate-800 font-medium leading-snug">
              <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" checked={c4} onChange={(e) => setC4(e.target.checked)} />
              <span>{t('auth.helper_check_4')}</span>
            </label>
          </li>
        </ul>

        <div className="mt-8 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            disabled={!allOk || loading}
            onClick={() => void onConfirm()}
            className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-slate-900/15 hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? t('common.loading') : t('auth.helper_confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
