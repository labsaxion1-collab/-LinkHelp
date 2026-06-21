import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as Icons from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import {
  getPrimaryCategories,
  getSubsForPrimary,
  groupSkillKeysByPrimary,
  isValidSkillKey,
  parseSkillKey,
  skillKey,
  skillPrimaryLabelKey,
  skillSubLabelKey,
} from '@/data/helperSkillsCatalog';

type TFn = (key: string, options?: Record<string, string | number>) => string;

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

export function SkillsProfileModal({
  open,
  onClose,
  skillIds,
  onSave,
  onSaveAsync,
  t,
}: {
  open: boolean;
  onClose: () => void;
  skillIds: string[];
  onSave: (ids: string[]) => void;
  onSaveAsync?: (ids: string[]) => Promise<void>;
  t: TFn;
}) {
  const [q, setQ] = useState('');
  const [step, setStep] = useState<'primary' | 'subs'>('primary');
  const [activePrimary, setActivePrimary] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(skillIds.filter(isValidSkillKey)));
  const [saving, setSaving] = useState(false);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      return;
    }
    if (!wasOpenRef.current) {
      setSelected(new Set(skillIds.filter(isValidSkillKey)));
      setStep('primary');
      setActivePrimary(null);
      setQ('');
      setSaving(false);
      wasOpenRef.current = true;
    }
  }, [open, skillIds]);

  const groupedSelected = useMemo(
    () => groupSkillKeysByPrimary([...selected]),
    [selected],
  );

  const selectedCount = selected.size;
  const primaryCategories = getPrimaryCategories();
  const needle = q.trim().toLowerCase();

  const filteredPrimaries = useMemo(() => {
    if (!needle) return primaryCategories;
    return primaryCategories.filter((c) => {
      const label = t(skillPrimaryLabelKey(c.id)).toLowerCase();
      return c.id.includes(needle) || label.includes(needle);
    });
  }, [needle, primaryCategories, t]);

  const filteredSubs = useMemo(() => {
    if (!activePrimary) return [];
    const subs = getSubsForPrimary(activePrimary);
    if (!needle) return subs;
    return subs.filter((sub) => {
      const label = t(skillSubLabelKey(activePrimary, sub)).toLowerCase();
      return sub.includes(needle) || label.includes(needle);
    });
  }, [activePrimary, needle, t]);

  if (!open) return null;

  const toggleSub = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const removeSkill = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  const openPrimary = (primaryId: string) => {
    setActivePrimary(primaryId);
    setStep('subs');
    setQ('');
  };

  const backToPrimaries = () => {
    setStep('primary');
    setActivePrimary(null);
    setQ('');
  };

  const handleSave = async () => {
    const ids: string[] = [...selected];
    if (onSaveAsync) {
      setSaving(true);
      try {
        await onSaveAsync(ids);
        onSave(ids);
        onClose();
      } catch {
        /* parent toast */
      } finally {
        setSaving(false);
      }
    } else {
      onSave(ids);
      onClose();
    }
  };

  const selectedStrip = (
    <div className="rounded-xl border border-sky-200/70 bg-gradient-to-br from-sky-50/80 via-white to-white px-3 py-3 shadow-sm space-y-3 max-h-[32vh] overflow-y-auto overscroll-contain">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
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
        <div className="space-y-3">
          {Array.from(groupedSelected.entries()).map(([primaryId, keys]) => (
            <div key={primaryId}>
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-500 mb-1.5">
                {t(skillPrimaryLabelKey(primaryId))}
              </p>
              <div className="flex flex-wrap gap-2">
                {keys.map((key) => {
                  const parsed = parseSkillKey(key);
                  const label = parsed ? t(skillSubLabelKey(parsed.primary, parsed.sub)) : key;
                  return (
                    <span
                      key={key}
                      className="inline-flex items-center gap-1 pl-3 pr-1 py-1.5 rounded-full bg-sky-50 border border-sky-200/90 text-sky-950 text-xs font-bold shadow-sm"
                    >
                      <span className="truncate max-w-[10rem] sm:max-w-[12rem]">{label}</span>
                      <button
                        type="button"
                        onClick={() => removeSkill(key)}
                        className="p-1.5 rounded-full text-sky-600 hover:bg-sky-200/80 hover:text-sky-900 transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center shrink-0"
                        aria-label={t('profile_setup.skills_remove_aria', { name: label })}
                      >
                        <Icons.X className="w-3.5 h-3.5" strokeWidth={2.5} />
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
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
      closeOnBackdrop={false}
      betweenScrollAndFooter={selectedStrip}
      footer={
        <div className="flex flex-col sm:flex-row justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2.5 text-slate-600 font-bold text-sm min-h-[44px] disabled:opacity-50 order-2 sm:order-1"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black min-h-[44px] disabled:opacity-50 inline-flex items-center justify-center gap-2 order-1 sm:order-2"
          >
            {saving ? <Icons.Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saving ? t('profile_setup.uploading') : t('profile_setup.skills_save_all')}
          </button>
        </div>
      }
    >
      {step === 'subs' && activePrimary ? (
        <button
          type="button"
          onClick={backToPrimaries}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-sky-700 hover:text-sky-900 min-h-[44px]"
        >
          <Icons.ChevronLeft className="w-4 h-4" />
          {t('profile_setup.skills_back_to_categories')}
        </button>
      ) : null}

      <p className="text-[10px] font-black uppercase tracking-wide text-slate-400 mb-1">
        {step === 'primary' ? t('profile_setup.skills_step_primary') : t('profile_setup.skills_step_sub')}
      </p>
      {step === 'subs' && activePrimary ? (
        <p className="text-lg font-bold text-slate-900 mb-3">{t(skillPrimaryLabelKey(activePrimary))}</p>
      ) : null}
      <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
        {step === 'primary' ? t('profile_setup.skills_primary_hint') : t('profile_setup.skills_sub_hint')}
      </p>

      <div className="relative mb-4">
        <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('profile_setup.skills_search')}
          className="w-full pl-10 pr-3 py-3 min-h-[48px] rounded-xl border border-slate-200 text-base sm:text-sm font-medium focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400 outline-none"
        />
      </div>

      {step === 'primary' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {filteredPrimaries.map((cat) => {
            const count = [...selected].filter((k) => k.startsWith(`${cat.id}:`)).length;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => openPrimary(cat.id)}
                className="flex items-center justify-between gap-2 px-4 py-3.5 rounded-xl border border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50/50 text-left min-h-[52px] transition-colors"
              >
                <span className="text-sm font-bold text-slate-900">{t(skillPrimaryLabelKey(cat.id))}</span>
                <span className="flex items-center gap-1 shrink-0 text-slate-400">
                  {count > 0 ? (
                    <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-1.5 py-0.5 rounded-full">{count}</span>
                  ) : null}
                  <Icons.ChevronRight className="w-4 h-4" />
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {filteredSubs.map((sub) => {
              const key = skillKey(activePrimary!, sub);
              const on = selected.has(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleSub(key)}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold border min-h-[44px] transition-all active:scale-[0.97] ${
                    on
                      ? 'border-sky-500 bg-sky-50 text-sky-900 shadow-sm ring-1 ring-sky-500/20'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50/80'
                  }`}
                >
                  {on ? <Icons.Check className="inline w-3.5 h-3.5 mr-1 -mt-0.5" /> : null}
                  {t(skillSubLabelKey(activePrimary!, sub))}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={backToPrimaries}
            className="mt-4 w-full min-h-[48px] rounded-xl border-2 border-slate-200 bg-white text-sm font-bold text-slate-800 hover:border-sky-300 hover:bg-sky-50/50 transition-colors inline-flex items-center justify-center gap-2"
          >
            <Icons.ChevronLeft className="w-4 h-4 shrink-0" />
            {t('profile_setup.skills_back_to_categories')}
          </button>
          <p className="text-[11px] text-slate-500 mt-3 leading-relaxed text-center">{t('profile_setup.skills_sub_continue_hint')}</p>
        </>
      )}

      {step === 'primary' ? (
        <p className="text-[11px] text-slate-400 mt-4 leading-relaxed">{t('profile_setup.skills_footer')}</p>
      ) : null}
    </ModalChrome>
  );
}
