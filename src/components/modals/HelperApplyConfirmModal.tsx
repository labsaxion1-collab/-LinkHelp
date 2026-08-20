import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import * as Icons from 'lucide-react';
import type { AppLanguage } from '@/services/translationService';
import { formatLinkCredits } from '@/utils/formatLinkCredits';
import type { HelperLeadCreditQuote } from '@/utils/helperLeadCreditQuote';
import type { HelperApplicationType } from '@/utils/helperOpportunityApply';
import { getApplicationTypeLabelKey } from '@/utils/helperOpportunityApply';
import { LH_CENTERED_MODAL_APPLY_PANEL_CLASS } from '@/components/design-system/lhCenteredModalScale';
import { LhPremiumCloseButton } from '@/components/design-system/LhPremiumCloseButton';

type Props = {
  open: boolean;
  submitting?: boolean;
  applicationType: HelperApplicationType;
  linkCreditsCost: number;
  creditQuote: HelperLeadCreditQuote;
  walletBalance?: number | null;
  language?: AppLanguage;
  onConfirm: () => void;
  onCancel: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

/**
 * Centered compact apply confirmation for normal + VIP — stays over the feed (no navigation).
 * Shares one shell; VIP gets a discrete gold treatment.
 */
export function HelperApplyConfirmModal({
  open,
  submitting = false,
  applicationType,
  linkCreditsCost,
  creditQuote,
  walletBalance = null,
  language = 'pt',
  onConfirm,
  onCancel,
  t,
}: Props) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const backButtonRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const typeLabel = t(getApplicationTypeLabelKey(applicationType));
  const costLabel = formatLinkCredits(linkCreditsCost, language);
  const currentBalanceLabel =
    walletBalance == null
      ? t('helper_dashboard.apply_wallet_balance_loading')
      : formatLinkCredits(walletBalance, language);
  const resultingBalance =
    walletBalance == null ? null : Math.max(0, walletBalance - linkCreditsCost);
  const resultingBalanceLabel =
    resultingBalance == null
      ? t('helper_dashboard.apply_balance_after_loading')
      : formatLinkCredits(resultingBalance, language);

  const isVip = applicationType === 'exclusive';

  useEffect(() => {
    if (!open) return;
    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = window.setTimeout(() => {
      backButtonRef.current?.focus();
    }, 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (submitting) return;
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      previouslyFocusedRef.current?.focus?.();
    };
  }, [open, submitting, onCancel]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px] motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200"
      style={{
        paddingTop: 'max(1rem, env(safe-area-inset-top))',
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
        paddingLeft: 'max(1rem, env(safe-area-inset-left))',
        paddingRight: 'max(1rem, env(safe-area-inset-right))',
      }}
      role="presentation"
      data-testid="helper-apply-confirm-backdrop"
      onClick={() => {
        if (!submitting) onCancel();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        data-testid="helper-apply-confirm-modal"
        data-modal-variant="centered-compact"
        data-application-type={applicationType}
        className={clsx(
          LH_CENTERED_MODAL_APPLY_PANEL_CLASS,
          'border bg-white px-4 pb-4 pt-3.5',
          'motion-safe:animate-in motion-safe:zoom-in-95 motion-safe:fade-in motion-safe:duration-200',
          isVip ? 'border-amber-200/90' : 'border-slate-100',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <LhPremiumCloseButton
          onClick={onCancel}
          label={t('common.close')}
          disabled={submitting}
          testId="helper-apply-confirm-close"
        />

        <div className="flex flex-col items-center text-center">
          <div
            className={clsx(
              'mb-2.5 flex h-11 w-11 items-center justify-center rounded-2xl border',
              isVip
                ? 'border-amber-200 bg-amber-50 text-amber-700'
                : 'border-blue-200 bg-blue-50 text-blue-700',
            )}
            aria-hidden
          >
            {isVip ? (
              <Icons.Crown className="h-5 w-5" strokeWidth={2.2} />
            ) : (
              <Icons.Send className="h-5 w-5" strokeWidth={2.2} />
            )}
          </div>
          <h2 id={titleId} className="pr-6 text-[17px] font-black leading-snug text-slate-950">
            {isVip
              ? t('helper_dashboard.apply_confirm_title_vip')
              : t('helper_dashboard.apply_confirm_title')}
          </h2>
          {isVip ? (
            <span
              className="mt-2 inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-black text-amber-800"
              data-testid="helper-apply-vip-badge"
            >
              <Icons.Crown className="h-3 w-3" aria-hidden />
              {t('helper_dashboard.apply_type_exclusive')}
            </span>
          ) : null}
        </div>

        <div
          id={descriptionId}
          className="mt-3 space-y-1.5 text-left text-[13px] font-medium leading-relaxed text-slate-600"
        >
          <p>{t('helper_dashboard.apply_confirm_type', { type: typeLabel })}</p>
          {isVip ? (
            <>
              <p>
                {t('helper_dashboard.split_vip_cost_now', {
                  count: formatLinkCredits(creditQuote.vipApplyLc, language),
                })}
              </p>
              <p className="text-[12px] text-slate-500">
                {t('helper_dashboard.split_vip_breakdown', {
                  full: formatLinkCredits(creditQuote.fullRequestLc, language),
                  surcharge: formatLinkCredits(4, language),
                })}
              </p>
              <p className="text-[12px] font-semibold text-amber-800">
                {t('helper_dashboard.feed_card_vip_no_hire_charge')}
              </p>
            </>
          ) : (
            <>
              <p>
                {t('helper_dashboard.split_normal_cost_now', {
                  count: formatLinkCredits(creditQuote.normalApplyLc, language),
                })}
              </p>
              <p>
                {t('helper_dashboard.split_normal_if_hired', {
                  count: formatLinkCredits(creditQuote.normalHireRemainderLc, language),
                })}
              </p>
              <p>
                {t('helper_dashboard.split_normal_total', {
                  count: formatLinkCredits(creditQuote.fullRequestLc, language),
                })}
              </p>
            </>
          )}
          <p>{t('helper_dashboard.apply_confirm_debit', { cost: costLabel })}</p>
          <p>{t('helper_dashboard.apply_confirm_current_balance', { count: currentBalanceLabel })}</p>
          <p>{t('helper_dashboard.apply_confirm_resulting_balance', { count: resultingBalanceLabel })}</p>
        </div>

        <div className="mt-4 flex flex-col gap-2.5">
          <button
            ref={backButtonRef}
            type="button"
            data-testid="helper-apply-confirm-back"
            disabled={submitting}
            onClick={onCancel}
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
          >
            {t('helper_dashboard.apply_confirm_back')}
          </button>
          <button
            type="button"
            data-testid="helper-apply-confirm-submit"
            disabled={submitting}
            onClick={onConfirm}
            className={clsx(
              'inline-flex min-h-[44px] w-full items-center justify-center rounded-2xl px-4 text-sm font-black text-white shadow-lg transition disabled:opacity-60',
              isVip
                ? 'border border-amber-300 bg-amber-500 shadow-amber-500/20 hover:bg-amber-600'
                : 'bg-gradient-to-br from-[#2563FF] to-[#1557F0] shadow-[0_8px_22px_rgba(37,99,255,0.28)] hover:brightness-105',
            )}
          >
            {submitting
              ? t('helper_dashboard.apply_sending')
              : isVip
                ? t('helper_dashboard.apply_confirm_yes_vip')
                : t('helper_dashboard.apply_confirm_yes')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
