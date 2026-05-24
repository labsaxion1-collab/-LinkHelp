import { useState } from 'react';
import { Briefcase, Search, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { HelperTermsGateModal } from '@/components/auth/HelperTermsGateModal';

type Props = {
  busy?: boolean;
  onConfirm: (role: 'client' | 'helper') => void | Promise<void>;
};

export function OAuthRolePicker({ busy, onConfirm }: Props) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<'client' | 'helper' | null>(null);
  const [helperModalOpen, setHelperModalOpen] = useState(false);
  const [helperLegalOk, setHelperLegalOk] = useState(false);

  const selectClient = () => {
    setMode('client');
    setHelperLegalOk(false);
    setHelperModalOpen(false);
  };

  const selectHelper = () => {
    setMode('helper');
    if (!helperLegalOk) setHelperModalOpen(true);
  };

  const handleContinue = () => {
    if (!mode) return;
    if (mode === 'helper' && !helperLegalOk) {
      setHelperModalOpen(true);
      return;
    }
    void onConfirm(mode);
  };

  return (
    <>
      <HelperTermsGateModal
        open={helperModalOpen}
        onClose={() => {
          setHelperModalOpen(false);
          if (!helperLegalOk) setMode(null);
        }}
        onConfirm={() => {
          setHelperLegalOk(true);
          setHelperModalOpen(false);
        }}
      />

      <div className="min-h-[100dvh] flex flex-col items-center justify-center px-4 py-10 bg-gradient-to-b from-slate-50 to-white">
        <div className="w-full max-w-md rounded-3xl bg-white border border-slate-100 shadow-xl p-6 sm:p-8 ring-1 ring-slate-100/80">
          <h1 className="text-xl font-black text-slate-900 text-center">{t('register_page.account_type_heading')}</h1>
          <p className="mt-2 text-sm text-slate-500 text-center leading-relaxed">{t('register_page.account_type_sub')}</p>

          <div className="mt-6 grid grid-cols-1 gap-3">
            <label
              className={`relative flex cursor-pointer rounded-2xl border p-4 shadow-sm transition-all hover:shadow-md ${
                mode === 'client' ? 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/20' : 'border-slate-200 bg-white'
              }`}
            >
              <input type="radio" name="oauth-mode" className="sr-only" checked={mode === 'client'} onChange={selectClient} />
              <span className="flex flex-1 items-center gap-3">
                <span
                  className={`p-2.5 rounded-xl flex items-center justify-center ${
                    mode === 'client' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Search className="w-5 h-5" />
                </span>
                <span className="flex flex-col text-left">
                  <span className="text-sm font-bold text-slate-900">{t('register_page.mode_client_title')}</span>
                  <span className="text-xs font-medium text-slate-500 mt-0.5">{t('register_page.mode_client_sub')}</span>
                </span>
              </span>
              {mode === 'client' ? <CheckCircle2 className="h-5 w-5 text-blue-600 absolute right-4 top-1/2 -translate-y-1/2" /> : null}
            </label>

            <label
              className={`relative flex cursor-pointer rounded-2xl border p-4 shadow-sm transition-all hover:shadow-md ${
                mode === 'helper' ? 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/20' : 'border-slate-200 bg-white'
              }`}
            >
              <input type="radio" name="oauth-mode" className="sr-only" checked={mode === 'helper'} onChange={selectHelper} />
              <span className="flex flex-1 items-center gap-3">
                <span
                  className={`p-2.5 rounded-xl flex items-center justify-center ${
                    mode === 'helper' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Briefcase className="w-5 h-5" />
                </span>
                <span className="flex flex-col text-left">
                  <span className="text-sm font-bold text-slate-900">{t('register_page.mode_helper_title')}</span>
                  <span className="text-xs font-medium text-slate-500 mt-0.5">{t('register_page.mode_helper_sub')}</span>
                </span>
              </span>
              {mode === 'helper' ? <CheckCircle2 className="h-5 w-5 text-blue-600 absolute right-4 top-1/2 -translate-y-1/2" /> : null}
            </label>
          </div>

          <button
            type="button"
            disabled={!mode || busy}
            onClick={handleContinue}
            className="mt-6 flex w-full justify-center rounded-2xl bg-slate-900 py-3.5 px-4 text-sm font-bold text-white shadow-lg hover:bg-black disabled:opacity-50 min-h-[52px]"
          >
            {busy ? t('common.loading') : t('common.continue')}
          </button>
        </div>
      </div>
    </>
  );
}
