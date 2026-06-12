import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as Icons from 'lucide-react';
import { clsx } from 'clsx';
import type { Job } from '@/types/job';
import type { AppLanguage } from '@/services/translationService';
import { formatBudgetRange, isProposalAmountValid, jobHasBoundedBudget, jobIsNegotiableBudget, validateHelperProposal } from '@/utils/jobProposal';
import { getHelperLeadCreditSummary, getHelperCreditPublicDisplay } from '@/utils/helperCreditDisplay';
import { formatJobBudgetDisplay } from '@/utils/formatJobBudget';
import { formatLinkCredits } from '@/utils/formatLinkCredits';
import { getCategoryFeedTheme } from '@/utils/categoryFeedTheme';
import { BRAND } from '@/utils/brandAssets';

const CHAT_LIMIT = 5;

type Props = {
  open: boolean;
  job: Job | null;
  submitting?: boolean;
  creditBalance?: number | null;
  onClose: () => void;
  onSubmit: (
    amount: number | null,
    message?: string | null,
    options?: { isExclusive?: boolean },
  ) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  language?: AppLanguage;
  distanceKm?: number | null;
  helperMessagesUsed?: number;
  clientMessagesUsed?: number;
};

export function HelperProposalModal({
  open,
  job,
  submitting = false,
  creditBalance = null,
  onClose,
  onSubmit,
  t,
  language = 'pt',
  distanceKm,
  helperMessagesUsed = 0,
  clientMessagesUsed = 0,
}: Props) {
  const [amount, setAmount] = useState('');
  const [proposalMessage, setProposalMessage] = useState('');
  const [error, setError] = useState('');
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [costsOpen, setCostsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const bounded = job ? jobHasBoundedBudget(job) : false;
  const negotiable = job ? jobIsNegotiableBudget(job) : false;
  // Amount is always required — helpers must declare a price before applying.
  const required = true;
  const isAmountValid = isProposalAmountValid(amount);

  useEffect(() => {
    if (!open) {
      setAmount('');
      setProposalMessage('');
      setError('');
    }
  }, [open, job?.id]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const sync = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardInset(inset > 48 ? inset : 0);
    };
    vv.addEventListener('resize', sync);
    vv.addEventListener('scroll', sync);
    sync();
    return () => {
      vv.removeEventListener('resize', sync);
      vv.removeEventListener('scroll', sync);
    };
  }, [open]);

  if (!open || !job) return null;

  const handleSubmit = (isExclusive = false) => {
    if (submitting) return;
    const result = validateHelperProposal(amount, job, required);
    if (result.ok === false) {
      setError(t(result.messageKey, result.messageVars));
      return;
    }
    setError('');
    const trimmed = proposalMessage.trim();
    onSubmit(result.amount, trimmed || null, { isExclusive });
  };

  const currency = job.currency?.trim() || 'CAD';
  const costs = getHelperLeadCreditSummary(job, distanceKm);
  const creditDisplay = getHelperCreditPublicDisplay(costs);
  const clientBudget = formatJobBudgetDisplay(job, t);
  const balanceLabel =
    creditBalance == null ? '…' : formatLinkCredits(creditBalance, language);
  const categoryTheme = getCategoryFeedTheme(job.category);

  const helperRemaining = Math.max(0, CHAT_LIMIT - helperMessagesUsed);
  const clientRemaining = Math.max(0, CHAT_LIMIT - clientMessagesUsed);

  const estimatedAvg = bounded && job.budgetMin != null && job.budgetMax != null
    ? ((job.budgetMin + job.budgetMax) / 2).toFixed(2)
    : '0.00';

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center p-0 sm:p-4"
      style={{ paddingBottom: keyboardInset > 0 ? keyboardInset : undefined }}
      role="presentation"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-[#0D1B2A]/50 backdrop-blur-sm" aria-hidden />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="helper-proposal-title"
        className={clsx(
          'relative z-10 flex w-full max-w-md flex-col bg-white',
          'max-h-[92dvh]',
          'rounded-t-[1.85rem] sm:rounded-[1.85rem]',
          'shadow-[0_-8px_40px_rgba(15,23,42,0.18),0_24px_64px_rgba(15,23,42,0.22)]',
          'animate-[helperProposalIn_0.42s_cubic-bezier(0.34,1.45,0.64,1)]',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="mx-auto pt-3 flex justify-center sm:hidden" aria-hidden>
          <div className="h-[5px] w-10 rounded-full bg-slate-200" />
        </div>

        {/* Header */}
        <header className="flex items-start justify-between gap-3 px-5 pb-2 pt-3">
          <div className="min-w-0">
            <h2 id="helper-proposal-title" className="text-[20px] font-black leading-tight tracking-tight text-slate-950">
              {t('helper_proposal.title')}
            </h2>
            <p className="mt-0.5 truncate text-sm font-semibold" style={{ color: categoryTheme.iconColor }}>
              {t(`categories.${job.category}`)}
              {job.subcategory ? <span className="text-slate-400"> • </span> : null}
              {job.subcategory ? (
                <span style={{ color: categoryTheme.iconColor }}>{t(`service_subs.${job.category}.${job.subcategory}`)}</span>
              ) : null}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 active:scale-95"
            aria-label={t('common.close')}
          >
            <Icons.X className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </header>

        {/* Body — scrollável */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-3 pt-1">

          {/* Detalhes do pedido — colapsível */}
          <div className="mb-2 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <button
              type="button"
              onClick={() => setCostsOpen((v) => !v)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-slate-50"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <Icons.FileText className="h-4 w-4" />
              </span>
              <span className="flex-1 text-sm font-bold text-slate-800">Detalhes do pedido</span>
              <span className="flex items-center gap-1 text-xs font-semibold text-[#2563EB]">
                {costsOpen ? t('common.hide') : 'Ver detalhes'}
                <Icons.ChevronDown
                  className={clsx('h-4 w-4 transition-transform duration-200', costsOpen && 'rotate-180')}
                />
              </span>
            </button>
            <div
              style={{
                display: 'grid',
                gridTemplateRows: costsOpen ? '1fr' : '0fr',
                transition: 'grid-template-rows 320ms cubic-bezier(0.4,0,0.2,1)',
              }}
            >
              <div style={{ overflow: 'hidden', minHeight: 0 }}>
              <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-3">

                {/* Descrição do pedido */}
                {job.description?.trim() ? (
                  <div>
                    <p className="mb-1 text-[10px] font-black uppercase tracking-wide text-slate-400">
                      {t('helper_dashboard.detail_observations')}
                    </p>
                    <p className="whitespace-pre-wrap rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-[13px] font-medium leading-relaxed text-slate-700">
                      {job.description.trim()}
                    </p>
                  </div>
                ) : null}

                {/* Localização */}
                {(job.address || job.city || job.location) ? (
                  <div className="flex items-start gap-2 text-[13px] font-medium text-slate-700">
                    <Icons.MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                    <span>{[job.address, job.city, job.region].filter(Boolean).join(', ') || job.location}</span>
                  </div>
                ) : null}

                {/* Horário/data preferido */}
                {(job.date || job.preferredDate || job.preferredTimeWindow) ? (
                  <div className="flex items-center gap-2 text-[13px] font-medium text-slate-700">
                    <Icons.Clock className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                    <span>{job.preferredTimeWindow || job.preferredDate || job.date}</span>
                  </div>
                ) : null}

                {/* Separador custos */}
                <div className="border-t border-slate-100 pt-3">
                  <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-slate-400">
                    {t('helper_proposal.job_section')}
                  </p>
                  <ul className="space-y-2 text-sm font-semibold text-slate-700">
                    <li className="flex justify-between gap-2">
                      <span className="text-slate-500">{t('helper_proposal.apply_cost_line')}</span>
                      <span className="tabular-nums text-slate-900">{creditDisplay.applyCost} LC</span>
                    </li>
                    <li className="flex justify-between gap-2">
                      <span className="text-slate-500">{t('helper_proposal.job_cost_line')}</span>
                      <span className="tabular-nums text-slate-900">{creditDisplay.jobCost} LC</span>
                    </li>
                    <li className="flex justify-between gap-2">
                      <span className="text-slate-500">{t('helper_proposal.selected_line')}</span>
                      <span className="tabular-nums text-slate-900">+{creditDisplay.hireEstimate} LC</span>
                    </li>
                    <li className="flex justify-between gap-2 border-t border-slate-100 pt-2 font-bold">
                      <span className="text-slate-800">{t('helper_proposal.total_estimate_line')}</span>
                      <span className="tabular-nums text-[#2563EB]">{creditDisplay.totalEstimate} LC</span>
                    </li>
                    <li className="flex justify-between gap-2 border-t border-slate-100 pt-2">
                      <span className="text-slate-500">{t('helper_proposal.balance_line')}</span>
                      <span className="tabular-nums text-slate-900">{balanceLabel}</span>
                    </li>
                  </ul>
                </div>
              </div>
              </div>
            </div>
          </div>

          {/* Orçamento do cliente */}
          <div className="mb-2 flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 px-4 py-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-white text-emerald-600">
              <Icons.ClipboardList className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                {t('helper_proposal.client_budget')}
              </p>
              <p className="mt-0.5 text-[17px] font-black leading-tight text-slate-900">{clientBudget}</p>
              {bounded && (
                <p className="mt-0.5 text-[13px] font-medium text-slate-500">
                  {t('helper_proposal.client_suggested')}: {formatBudgetRange(job, t)}
                </p>
              )}
              {!bounded && (
                <p className="mt-0.5 text-[13px] font-medium text-slate-500">
                  O cliente não definiu um orçamento para este serviço.
                </p>
              )}
            </div>
          </div>

          {/* Campo de proposta */}
          <label className="mb-1 block text-sm font-bold text-slate-800">
            {t('helper_proposal.your_proposal')}
            <span className="ml-1 text-sm font-semibold text-slate-400">/ Preço médio estimado</span>
          </label>
          <div className="flex min-h-[50px] items-center overflow-hidden rounded-2xl border-2 border-slate-200 bg-white px-4 focus-within:border-[#2563EB] focus-within:ring-4 focus-within:ring-blue-500/10">
            <span className="mr-2 shrink-0 text-base font-bold text-slate-400">{currency} $</span>
            <input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              pattern="[0-9]*"
              autoComplete="off"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value.replace(/[^\d.,]/g, ''));
                setError('');
              }}
              placeholder={bounded ? String(Math.round(job.budgetMin!)) : t('helper_proposal.amount_placeholder')}
              className="min-w-0 flex-1 bg-transparent text-[22px] font-black text-slate-950 outline-none placeholder:text-slate-300"
            />
          </div>
          {error ? <p className="mt-1.5 text-sm font-semibold text-rose-600">{error}</p> : null}


          {/* Mensagem ao cliente */}
          <label className="mb-1 mt-2.5 block text-sm font-bold text-slate-800">
            {t('helper_proposal.message_label')}
            <span className="ml-1 text-xs font-semibold text-slate-400">({t('helper_proposal.optional')})</span>
          </label>
          <div className="relative">
            <textarea
              value={proposalMessage}
              onChange={(e) => setProposalMessage(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder={t('helper_proposal.message_placeholder')}
              className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10"
            />
            <span className="absolute bottom-3 right-4 text-[11px] font-semibold text-slate-400">
              {proposalMessage.length}/500
            </span>
          </div>

          {/* Banner chat pré-contratação */}
          <div className="mt-2 overflow-hidden rounded-2xl border border-blue-100 bg-blue-50/50">
            {/* Cabeçalho sempre visível */}
            <div className="flex items-center gap-2.5 px-4 py-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-[#2563EB]">
                <Icons.MessageSquare className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-black text-slate-900">Chat pré-contratação</p>
                <p className="text-[11px] font-medium text-slate-500">Limite de mensagens antes de contratar</p>
              </div>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                <Icons.Lock className="h-3.5 w-3.5 text-[#2563EB]" />
              </span>
            </div>

            {/* Contadores de mensagens */}
            <div className="grid grid-cols-2 gap-2 px-4 pb-3">
              {/* Helper */}
              <div
                className="rounded-xl border bg-white px-3 py-2.5"
                style={{ borderColor: `${categoryTheme.iconColor}30` }}
              >
                <p
                  className="mb-1.5 text-[10px] font-black uppercase tracking-wide"
                  style={{ color: categoryTheme.iconColor }}
                >
                  Você (helper)
                </p>
                <div className="flex gap-1">
                  {Array.from({ length: CHAT_LIMIT }).map((_, i) => {
                    const used = i >= helperRemaining;
                    return (
                      <span
                        key={i}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors duration-300"
                        style={used
                          ? { backgroundColor: '#E2E8F0', color: '#94A3B8' }
                          : { backgroundColor: categoryTheme.iconColor, color: '#fff' }
                        }
                        title={used ? 'Mensagem enviada' : 'Disponível'}
                      >
                        <Icons.MessageCircle className="h-3 w-3" />
                      </span>
                    );
                  })}
                </div>
                <p className="mt-1.5 text-[11px] font-semibold text-slate-500">
                  {helperRemaining}/{CHAT_LIMIT} disponíveis
                </p>
              </div>

              {/* Cliente */}
              <div
                className="rounded-xl border bg-white px-3 py-2.5"
                style={{ borderColor: `${categoryTheme.iconColor}20` }}
              >
                <p
                  className="mb-1.5 text-[10px] font-black uppercase tracking-wide"
                  style={{ color: `${categoryTheme.iconColor}aa` }}
                >
                  Cliente
                </p>
                <div className="flex gap-1">
                  {Array.from({ length: CHAT_LIMIT }).map((_, i) => {
                    const used = i >= clientRemaining;
                    return (
                      <span
                        key={i}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors duration-300"
                        style={used
                          ? { backgroundColor: '#E2E8F0', color: '#94A3B8' }
                          : { backgroundColor: `${categoryTheme.iconColor}66`, color: categoryTheme.iconColor }
                        }
                        title={used ? 'Resposta enviada' : 'Disponível'}
                      >
                        <Icons.MessageCircle className="h-3 w-3" />
                      </span>
                    );
                  })}
                </div>
                <p className="mt-1.5 text-[11px] font-semibold text-slate-500">
                  {clientRemaining}/{CHAT_LIMIT} disponíveis
                </p>
              </div>
            </div>

            {/* Rodapé informativo */}
            <div className="flex items-center gap-2 border-t border-blue-100 px-4 py-2">
              <Icons.Lock className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
              <p className="text-[11px] font-medium text-slate-500">
                Após o limite, o chat fica <span className="font-bold text-slate-700">bloqueado</span> até o cliente contratar.
                Contatos externos liberados só após confirmação.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-slate-100 bg-white px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex gap-2">
            {/* Candidatura exclusiva */}
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={submitting || !isAmountValid}
              className="inline-flex min-h-[68px] flex-1 flex-col items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 shadow-sm transition hover:bg-amber-100 active:scale-[0.98] disabled:opacity-60"
            >
              <span className="flex items-center gap-1.5">
                <Icons.Crown className="h-4 w-4 shrink-0 text-amber-500" />
                <span className="truncate text-[13.5px] font-black text-amber-900">Candidatura exclusiva</span>
              </span>
              <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-700/80">
                <img
                  src={BRAND.linkCreditCoin}
                  alt=""
                  aria-hidden
                  className="h-4 w-4 shrink-0 object-contain"
                />
                Usará <span className="font-bold ml-0.5">{creditDisplay.totalEstimate} LC</span>
              </span>
            </button>

            {/* Enviar candidatura */}
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={submitting || !isAmountValid}
              className="inline-flex min-h-[68px] flex-1 flex-col items-center justify-center gap-1.5 rounded-xl bg-[#2563EB] px-3 shadow-md shadow-blue-500/25 transition hover:bg-[#1D4ED8] active:scale-[0.98] disabled:opacity-60"
            >
              {submitting ? (
                <Icons.Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : (
                <>
                  <span className="flex items-center gap-1.5">
                    <Icons.Send className="h-4 w-4 shrink-0 text-white" strokeWidth={2.25} />
                    <span className="truncate text-[13.5px] font-black text-white">
                      {t('helper_proposal.submit')}
                    </span>
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-blue-200">
                    <img
                      src={BRAND.linkCreditCoin}
                      alt=""
                      aria-hidden
                      className="h-4 w-4 shrink-0 object-contain"
                    />
                    Usará <span className="font-bold ml-0.5">{creditDisplay.applyCost} LC</span>
                  </span>
                </>
              )}
            </button>
          </div>
          <p className="mt-3 text-center text-[11px] font-medium text-slate-400">
            Ao enviar, você confirma que leu e concorda com os{' '}
            <span className="font-semibold text-[#2563EB]">termos da plataforma</span>.
          </p>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
