import { useState } from 'react';
import * as Icons from 'lucide-react';
import { clsx } from 'clsx';
import { getChatHeroAccentTheme } from '@/components/chat/chatHeroTheme';

type ChipButtonProps = {
  label: string;
  onClick: () => void;
  chevronRotated?: boolean;
  disabled?: boolean;
  heroKey?: string | null;
};

function ChatPremiumChipButton({ label, onClick, chevronRotated = false, disabled = false, heroKey }: ChipButtonProps) {
  const theme = getChatHeroAccentTheme(heroKey);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        'relative flex w-full items-center justify-center rounded-lg border border-white/12 bg-black/28 px-8 py-1.5 backdrop-blur-sm transition-colors',
        !disabled && 'hover:border-white/20 hover:bg-black/36',
        disabled && 'cursor-default opacity-70',
      )}
    >
      <span className="max-w-full truncate text-center text-[12px] font-medium text-white/92">{label}</span>
      <Icons.ChevronDown
        className={clsx(
          'absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 shrink-0 transition-transform duration-200',
          theme.chipChevron,
          chevronRotated && 'rotate-180',
        )}
        aria-hidden
      />
    </button>
  );
}

type PreMatchStripProps = {
  title: string;
  hint: string;
  onExpand: () => void;
  heroKey?: string | null;
};

/** Faixa pré-contrato — texto clicável no estilo chip; toque abre o sheet informativo. */
export function ChatPreMatchStrip({ title, hint, onExpand, heroKey }: PreMatchStripProps) {
  const theme = getChatHeroAccentTheme(heroKey);

  return (
    <div className="shrink-0 border-b border-[#E9EDF5]/80 bg-[#FAFBFD] px-3 py-2 sm:px-4">
      <button
        type="button"
        onClick={onExpand}
        className={clsx('relative flex w-full items-center justify-center rounded-lg border border-white/12 px-8 py-2 text-center backdrop-blur-sm transition-colors hover:border-white/20', theme.chipBackdrop)}
      >
        <p className="max-w-full text-[10px] font-medium leading-snug">
          <Icons.Lock className={clsx('mr-1 inline-block h-3 w-3 -translate-y-px', theme.chipAccentText)} aria-hidden />
          <span className="font-semibold text-white/95">{title}</span>
          <span className="mx-1 text-white/35">·</span>
          <span className={theme.chipAccentText}>{hint}</span>
        </p>
        <Icons.ChevronDown
          className={clsx('absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 shrink-0', theme.chipChevron)}
          aria-hidden
        />
      </button>
    </div>
  );
}

type PreMatchInlineNoteProps = {
  text: string;
  onPress: () => void;
};

/** Nota discreta abaixo de "Hoje" — toque abre detalhes do pré-contrato. */
export function ChatPreMatchInlineNote({ text, onPress }: PreMatchInlineNoteProps) {
  return (
    <button
      type="button"
      onClick={onPress}
      className="-mt-1.5 mx-auto block w-full max-w-md px-2 py-0 text-center text-[10px] font-medium leading-snug text-[#94A3B8] transition-colors hover:text-[#64748B]"
    >
      {text}
    </button>
  );
}

type ThreadServiceChipProps = {
  title: string;
  dateLabel: string;
  location?: string;
  budgetLabel?: string;
  viewDetailsLabel: string;
  disabled?: boolean;
  onViewDetails: () => void;
  heroKey?: string | null;
};

/** Chip minimalista no cabeçalho premium — expande por cima da composição. */
export function ChatThreadServiceChip({
  title,
  dateLabel,
  location,
  budgetLabel,
  viewDetailsLabel,
  disabled = false,
  onViewDetails,
  heroKey,
}: ThreadServiceChipProps) {
  const [expanded, setExpanded] = useState(false);
  const theme = getChatHeroAccentTheme(heroKey);

  return (
    <div className="relative z-20">
      <ChatPremiumChipButton
        label={title}
        disabled={disabled}
        chevronRotated={expanded}
        heroKey={heroKey}
        onClick={() => setExpanded((v) => !v)}
      />

      {expanded ? (
        <>
          <button
            type="button"
            className={clsx('fixed inset-0 z-[55] backdrop-blur-[2px]', theme.serviceOverlay)}
            onClick={() => setExpanded(false)}
            aria-label="Fechar"
          />
          <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-[60] overflow-hidden rounded-xl border border-[#E9EDF5] bg-white shadow-[0_18px_48px_rgba(0,0,0,0.28)]">
            <div className="px-3.5 py-3">
              <p className="truncate text-[14px] font-semibold text-[#0B1220]">{title}</p>
              <p className="mt-1.5 flex items-center gap-1.5 text-[12px] font-medium text-[#64748B]">
                <Icons.CalendarDays className="h-3.5 w-3.5 shrink-0 text-[#94A3B8]" aria-hidden />
                <span className="truncate">{dateLabel}</span>
              </p>
              {location ? (
                <p className="mt-1.5 flex items-center gap-1.5 text-[12px] font-medium text-[#64748B]">
                  <Icons.MapPin className="h-3.5 w-3.5 shrink-0 text-[#94A3B8]" aria-hidden />
                  <span className="truncate">{location}</span>
                </p>
              ) : null}
              {budgetLabel ? (
                <p className="mt-1.5 flex items-center gap-1.5 text-[12px] font-medium text-[#64748B]">
                  <Icons.CircleDollarSign className="h-3.5 w-3.5 shrink-0 text-[#94A3B8]" aria-hidden />
                  <span className="truncate">{budgetLabel}</span>
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setExpanded(false);
                  onViewDetails();
                }}
                disabled={disabled}
                className={clsx('mt-3 flex h-8 w-full items-center justify-center gap-1 rounded-full border text-[11px] font-semibold transition-colors disabled:cursor-default disabled:opacity-60', theme.serviceCta)}
              >
                {viewDetailsLabel}
                <Icons.ChevronRight className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}