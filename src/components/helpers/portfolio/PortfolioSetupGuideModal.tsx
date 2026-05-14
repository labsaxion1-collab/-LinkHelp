import React, { useEffect, useState } from 'react';
import * as Icons from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

type Props = {
  open: boolean;
  onClose: () => void;
  /** Called when user finishes the last step — optional persistence hook. */
  onCompleted?: () => void;
};

const STEP_COUNT = 3;

export function PortfolioSetupGuideModal({ open, onClose, onCompleted }: Props) {
  const { t } = useLanguage();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  if (!open) return null;

  const goNext = () => {
    if (step < STEP_COUNT - 1) setStep(step + 1);
    else {
      onCompleted?.();
      onClose();
    }
  };

  const skip = () => {
    onClose();
  };

  const examples = [
    'portfolio_onboarding.ex_assembly',
    'portfolio_onboarding.ex_cleaning',
    'portfolio_onboarding.ex_painting',
    'portfolio_onboarding.ex_moving',
    'portfolio_onboarding.ex_garden',
    'portfolio_onboarding.ex_beauty',
    'portfolio_onboarding.ex_translation',
  ];

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/55 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="portfolio-guide-title"
    >
      <div
        className="bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl shadow-2xl border border-slate-100 max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 px-5 pt-5 pb-3 border-b border-slate-100 bg-gradient-to-br from-sky-50/80 via-white to-violet-50/40">
          <div className="flex justify-between items-start gap-3">
            <div className="flex gap-3 min-w-0">
              <div className="shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/25 text-white">
                <Icons.Sparkles className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-sky-700 mb-0.5">
                  {t('portfolio_onboarding.badge')}
                </p>
                <h2 id="portfolio-guide-title" className="text-lg font-black text-slate-900 leading-tight">
                  {t('portfolio_onboarding.title')}
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-1 leading-snug">
                  {t('portfolio_onboarding.subtitle')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={skip}
              className="shrink-0 p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              aria-label={t('common.close')}
            >
              <Icons.X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex gap-1.5 mt-4">
            {Array.from({ length: STEP_COUNT }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  i <= step ? 'bg-gradient-to-r from-sky-500 to-indigo-500' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
          <p className="text-[10px] font-semibold text-slate-400 mt-2">
            {t('portfolio_onboarding.step_indicator', { current: step + 1, total: STEP_COUNT })}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-5">
          {step === 0 && (
            <section className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
              <div className="flex gap-2 items-start">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-700 shrink-0">
                  <Icons.Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">{t('portfolio_onboarding.step1_title')}</h3>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">{t('portfolio_onboarding.step1_body')}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {examples.map((key) => (
                  <span
                    key={key}
                    className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-100 text-[11px] font-semibold text-slate-700"
                  >
                    {t(key)}
                  </span>
                ))}
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-3 py-3 flex gap-2">
                <Icons.Heart className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-xs font-medium text-emerald-900 leading-relaxed">{t('portfolio_onboarding.step1_trust_line')}</p>
              </div>
            </section>
          )}

          {step === 1 && (
            <section className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
              <div className="flex gap-2 items-start">
                <div className="p-2 rounded-xl bg-violet-50 text-violet-700 shrink-0">
                  <Icons.Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">{t('portfolio_onboarding.step2_title')}</h3>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">{t('portfolio_onboarding.step2_body')}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-black text-[10px] uppercase tracking-wide mb-2">
                    <Icons.CheckCircle2 className="w-4 h-4" /> {t('portfolio_onboarding.good_label')}
                  </div>
                  <ul className="space-y-1.5 text-[11px] font-medium text-emerald-900/90">
                    {[1, 2, 3].map((n) => (
                      <li key={n} className="flex gap-1.5">
                        <Icons.Check className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        {t(`portfolio_onboarding.good_${n}`)}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-3">
                  <div className="flex items-center gap-1.5 text-rose-800 font-black text-[10px] uppercase tracking-wide mb-2">
                    <Icons.XCircle className="w-4 h-4" /> {t('portfolio_onboarding.bad_label')}
                  </div>
                  <ul className="space-y-1.5 text-[11px] font-medium text-rose-900/90">
                    {[1, 2, 3, 4].map((n) => (
                      <li key={n} className="flex gap-1.5">
                        <Icons.X className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        {t(`portfolio_onboarding.bad_${n}`)}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{t('portfolio_onboarding.video_section_title')}</p>
                <ul className="space-y-1 text-[11px] text-slate-700 font-medium">
                  {[1, 2, 3, 4].map((n) => (
                    <li key={n} className="flex gap-2">
                      <Icons.Film className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
                      {t(`portfolio_onboarding.video_tip_${n}`)}
                    </li>
                  ))}
                </ul>
                <p className="text-[10px] text-slate-500 italic">{t('portfolio_onboarding.video_examples_line')}</p>
              </div>

              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{t('portfolio_onboarding.photo_section_title')}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] font-bold text-emerald-700 mb-1">{t('portfolio_onboarding.photo_recommended')}</p>
                    <ul className="space-y-0.5 text-[11px] text-slate-700">
                      {[1, 2, 3, 4].map((n) => (
                        <li key={n}>• {t(`portfolio_onboarding.photo_ok_${n}`)}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-rose-700 mb-1">{t('portfolio_onboarding.photo_avoid')}</p>
                    <ul className="space-y-0.5 text-[11px] text-slate-700">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <li key={n}>• {t(`portfolio_onboarding.photo_no_${n}`)}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
              <div className="flex gap-2 items-start">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700 shrink-0">
                  <Icons.TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">{t('portfolio_onboarding.step3_title')}</h3>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">{t('portfolio_onboarding.step3_body')}</p>
                </div>
              </div>
              <ul className="space-y-2">
                {[1, 2, 3, 4].map((n) => (
                  <li
                    key={n}
                    className="flex gap-3 items-start rounded-xl border border-slate-100 bg-white px-3 py-2.5 shadow-sm"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-100 to-indigo-100 flex items-center justify-center shrink-0">
                      <Icons.Check className="w-4 h-4 text-indigo-600" strokeWidth={3} />
                    </div>
                    <span className="text-sm font-medium text-slate-700 leading-snug">{t(`portfolio_onboarding.step3_point_${n}`)}</span>
                  </li>
                ))}
              </ul>
              <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50/80 px-3 py-3">
                <p className="text-xs font-semibold text-amber-950 leading-relaxed">{t('portfolio_onboarding.motivation_main')}</p>
                <p className="text-[11px] text-amber-900/80 mt-2 leading-relaxed">{t('portfolio_onboarding.motivation_extra')}</p>
              </div>
            </section>
          )}

          <div className="rounded-2xl border border-slate-200 bg-slate-900 text-slate-100 px-3 py-3 flex gap-2">
            <Icons.ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                {t('portfolio_onboarding.safety_title')}
              </p>
              <p className="text-[11px] leading-relaxed text-slate-200">{t('portfolio_onboarding.safety_body')}</p>
            </div>
          </div>
        </div>

        <div className="shrink-0 p-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row gap-2 sm:justify-between sm:items-center">
          <button
            type="button"
            onClick={skip}
            className="order-2 sm:order-1 py-3.5 sm:py-2.5 px-4 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors min-h-[48px]"
          >
            {t('portfolio_onboarding.skip')}
          </button>
          <button
            type="button"
            onClick={goNext}
            className="order-1 sm:order-2 w-full sm:w-auto min-h-[48px] py-3.5 sm:py-3 px-6 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 text-white text-sm font-black shadow-lg shadow-sky-500/25 hover:from-sky-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2"
          >
            {step < STEP_COUNT - 1 ? (
              <>
                {t('common.next')}
                <Icons.ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <Icons.Check className="w-4 h-4" strokeWidth={3} />
                {t('portfolio_onboarding.done')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
