import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { createPortal } from 'react-dom';
import { TrendingUp, CheckCircle, AlertCircle, Loader2, HelpCircle, ShieldCheck } from 'lucide-react';
import { LhCard } from '@/components/design-system/LhCard';
import { useGamification } from '@/gamification/hooks/useGamification';
import { formatProgressSubtitle, getProgressToNextLevel } from '@/gamification/engines/progressEngine';
import { EMPTY_GAMIFICATION_STATS } from '@/gamification/services/gamificationStatsAdapter';
import type { UserType } from '@/gamification/types/gamification';
import { MEDAL_MAP } from '@/gamification/config/gamificationMedals';
import { GAMIFICATION_TUTORIAL_TITLE } from '@/gamification/config/gamificationTutorialContent';
import { GamificationTutorialModal } from '@/gamification/components/GamificationTutorialModal';

type ProgressAccentTheme = {
  textClass: string;
  iconClass: string;
  heroBorderClass: string;
  heroTrackClass: string;
  heroBarClass: string;
  cardTrackClass: string;
  cardBarClass: string;
  tutorialButtonClass: string;
};

/** Tema compartilhado da barra de próximo nível por hero/medalha. */
const PROGRESS_ACCENT_THEME: Record<string, ProgressAccentTheme> = {
  helper_novo: {
    textClass: 'text-lime-400',
    iconClass: 'border-lime-300/20 bg-lime-500/15 text-lime-300',
    heroBorderClass: 'border-lime-400/15',
    heroTrackClass: 'bg-lime-950/50',
    heroBarClass: 'bg-gradient-to-r from-lime-500 to-lime-300 shadow-[0_0_14px_rgba(163,230,53,0.36)]',
    cardTrackClass: 'bg-lime-50',
    cardBarClass: 'bg-gradient-to-r from-lime-600 to-lime-400 shadow-[0_0_12px_rgba(132,204,22,0.24)]',
    tutorialButtonClass: 'border-lime-100 bg-lime-50/70 text-lime-700 hover:bg-lime-100/80',
  },
  helper_confiavel: {
    textClass: 'text-[#3B82FF]',
    iconClass: 'border-[#006DFF]/45 bg-[#001E5A]/70 text-[#2F7DFF]',
    heroBorderClass: 'border-[#0047FF]/35',
    heroTrackClass: 'bg-[#020A24]/85',
    heroBarClass: 'bg-gradient-to-r from-[#001BFF] via-[#0047FF] to-[#006DFF] shadow-[0_0_20px_rgba(0,71,255,0.72)]',
    cardTrackClass: 'bg-[#E7EEFF]',
    cardBarClass: 'bg-gradient-to-r from-[#001BFF] via-[#0047FF] to-[#006DFF] shadow-[0_0_16px_rgba(0,71,255,0.58)]',
    tutorialButtonClass: 'border-[#B8CAFF] bg-[#E7EEFF]/85 text-[#003BFF] hover:bg-[#DCE6FF]',
  },
  helper_profissional: {
    textClass: 'text-amber-300',
    iconClass: 'border-amber-300/20 bg-amber-500/15 text-amber-300',
    heroBorderClass: 'border-amber-400/15',
    heroTrackClass: 'bg-amber-950/45',
    heroBarClass: 'bg-gradient-to-r from-amber-600 to-yellow-300 shadow-[0_0_14px_rgba(251,191,36,0.32)]',
    cardTrackClass: 'bg-amber-50',
    cardBarClass: 'bg-gradient-to-r from-amber-700 to-yellow-400 shadow-[0_0_12px_rgba(217,119,6,0.24)]',
    tutorialButtonClass: 'border-amber-100 bg-amber-50/70 text-amber-700 hover:bg-amber-100/80',
  },
  helper_elite: {
    textClass: 'text-[#3B82FF]',
    iconClass: 'border-[#006DFF]/45 bg-[#001E5A]/70 text-[#2F7DFF]',
    heroBorderClass: 'border-[#0047FF]/35',
    heroTrackClass: 'bg-[#020A24]/85',
    heroBarClass: 'bg-gradient-to-r from-[#001BFF] via-[#0047FF] to-[#006DFF] shadow-[0_0_20px_rgba(0,71,255,0.72)]',
    cardTrackClass: 'bg-[#E7EEFF]',
    cardBarClass: 'bg-gradient-to-r from-[#001BFF] via-[#0047FF] to-[#006DFF] shadow-[0_0_16px_rgba(0,71,255,0.58)]',
    tutorialButtonClass: 'border-[#B8CAFF] bg-[#E7EEFF]/85 text-[#003BFF] hover:bg-[#DCE6FF]',
  },
  helper_top_helper: {
    textClass: 'text-violet-300',
    iconClass: 'border-violet-300/20 bg-violet-500/15 text-violet-300',
    heroBorderClass: 'border-violet-400/15',
    heroTrackClass: 'bg-violet-950/45',
    heroBarClass: 'bg-gradient-to-r from-violet-600 to-fuchsia-300 shadow-[0_0_14px_rgba(168,85,247,0.34)]',
    cardTrackClass: 'bg-violet-50',
    cardBarClass: 'bg-gradient-to-r from-violet-700 to-fuchsia-400 shadow-[0_0_12px_rgba(124,58,237,0.24)]',
    tutorialButtonClass: 'border-violet-100 bg-violet-50/70 text-violet-700 hover:bg-violet-100/80',
  },
  helper_lenda: {
    textClass: 'text-amber-300',
    iconClass: 'border-amber-200/20 bg-amber-500/15 text-amber-200',
    heroBorderClass: 'border-amber-300/15',
    heroTrackClass: 'bg-amber-950/45',
    heroBarClass: 'bg-gradient-to-r from-amber-700 to-yellow-300 shadow-[0_0_14px_rgba(251,191,36,0.34)]',
    cardTrackClass: 'bg-yellow-50',
    cardBarClass: 'bg-gradient-to-r from-amber-800 to-yellow-400 shadow-[0_0_12px_rgba(180,83,9,0.24)]',
    tutorialButtonClass: 'border-yellow-100 bg-yellow-50/70 text-amber-800 hover:bg-yellow-100/80',
  },
  client_novo: {
    textClass: 'text-lime-400',
    iconClass: 'border-lime-300/20 bg-lime-500/15 text-lime-300',
    heroBorderClass: 'border-lime-400/15',
    heroTrackClass: 'bg-lime-950/50',
    heroBarClass: 'bg-gradient-to-r from-lime-500 to-lime-300 shadow-[0_0_14px_rgba(163,230,53,0.36)]',
    cardTrackClass: 'bg-lime-50',
    cardBarClass: 'bg-gradient-to-r from-lime-600 to-lime-400 shadow-[0_0_12px_rgba(132,204,22,0.24)]',
    tutorialButtonClass: 'border-lime-100 bg-lime-50/70 text-lime-700 hover:bg-lime-100/80',
  },
  client_confiavel: {
    textClass: 'text-[#3B82FF]',
    iconClass: 'border-[#006DFF]/45 bg-[#001E5A]/70 text-[#2F7DFF]',
    heroBorderClass: 'border-[#0047FF]/35',
    heroTrackClass: 'bg-[#020A24]/85',
    heroBarClass: 'bg-gradient-to-r from-[#001BFF] via-[#0047FF] to-[#006DFF] shadow-[0_0_20px_rgba(0,71,255,0.72)]',
    cardTrackClass: 'bg-[#E7EEFF]',
    cardBarClass: 'bg-gradient-to-r from-[#001BFF] via-[#0047FF] to-[#006DFF] shadow-[0_0_16px_rgba(0,71,255,0.58)]',
    tutorialButtonClass: 'border-[#B8CAFF] bg-[#E7EEFF]/85 text-[#003BFF] hover:bg-[#DCE6FF]',
  },
  client_ouro: {
    textClass: 'text-amber-300',
    iconClass: 'border-amber-300/20 bg-amber-500/15 text-amber-300',
    heroBorderClass: 'border-amber-400/15',
    heroTrackClass: 'bg-amber-950/45',
    heroBarClass: 'bg-gradient-to-r from-amber-600 to-yellow-300 shadow-[0_0_14px_rgba(251,191,36,0.32)]',
    cardTrackClass: 'bg-amber-50',
    cardBarClass: 'bg-gradient-to-r from-amber-700 to-yellow-400 shadow-[0_0_12px_rgba(217,119,6,0.24)]',
    tutorialButtonClass: 'border-amber-100 bg-amber-50/70 text-amber-700 hover:bg-amber-100/80',
  },
  client_vip: {
    textClass: 'text-violet-300',
    iconClass: 'border-violet-300/20 bg-violet-500/15 text-violet-300',
    heroBorderClass: 'border-violet-400/15',
    heroTrackClass: 'bg-violet-950/45',
    heroBarClass: 'bg-gradient-to-r from-violet-600 to-fuchsia-300 shadow-[0_0_14px_rgba(168,85,247,0.34)]',
    cardTrackClass: 'bg-violet-50',
    cardBarClass: 'bg-gradient-to-r from-violet-700 to-fuchsia-400 shadow-[0_0_12px_rgba(124,58,237,0.24)]',
    tutorialButtonClass: 'border-violet-100 bg-violet-50/70 text-violet-700 hover:bg-violet-100/80',
  },
  client_elite: {
    textClass: 'text-amber-300',
    iconClass: 'border-amber-200/20 bg-amber-500/15 text-amber-200',
    heroBorderClass: 'border-amber-300/15',
    heroTrackClass: 'bg-amber-950/45',
    heroBarClass: 'bg-gradient-to-r from-amber-700 to-yellow-300 shadow-[0_0_14px_rgba(251,191,36,0.34)]',
    cardTrackClass: 'bg-yellow-50',
    cardBarClass: 'bg-gradient-to-r from-amber-800 to-yellow-400 shadow-[0_0_12px_rgba(180,83,9,0.24)]',
    tutorialButtonClass: 'border-yellow-100 bg-yellow-50/70 text-amber-800 hover:bg-yellow-100/80',
  },
};

function getProgressAccentTheme(heroKey: string, userType: UserType): ProgressAccentTheme {
  return PROGRESS_ACCENT_THEME[heroKey] ?? PROGRESS_ACCENT_THEME[`${userType}_novo`];
}

type Props = {
  userType: UserType;
  className?: string;
  variant?: 'card' | 'hero';
};

export type HeroBadgeVariant = 'verde' | 'blue' | 'gold' | 'purple' | 'magenta' | 'elite';

const BADGE_BUTTON_CLASS: Record<HeroBadgeVariant, string> = {
  verde:
    'lh-hero-nivel-badge inline-flex min-w-[7.5rem] items-center justify-center gap-2 rounded-full border border-lime-300/35 bg-gradient-to-b from-lime-400 to-green-800 px-4 py-1 text-sm font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300 sm:min-w-[9rem] sm:text-base',
  blue:
    'lh-hero-nivel-badge-blue inline-flex min-w-[7.5rem] items-center justify-center gap-2 rounded-full border border-blue-300/35 bg-gradient-to-b from-blue-400 to-blue-900 px-4 py-1 text-sm font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 sm:min-w-[9rem] sm:text-base',
  gold:
    'lh-hero-nivel-badge-gold inline-flex min-w-[7.5rem] items-center justify-center gap-2 rounded-full border border-amber-200/50 bg-gradient-to-b from-amber-300 via-amber-500 to-amber-900 px-4 py-1 text-sm font-black text-amber-950 shadow-[0_0_18px_rgba(251,191,36,0.24)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 sm:min-w-[9rem] sm:text-base',
  purple:
    'lh-hero-nivel-badge-purple inline-flex min-w-[7.5rem] items-center justify-center gap-2 rounded-full border border-purple-200/45 bg-gradient-to-b from-purple-300 via-violet-500 to-purple-950 px-4 py-1 text-sm font-black shadow-[0_0_22px_rgba(168,85,247,0.34)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 sm:min-w-[9rem] sm:text-base',
  magenta:
    'lh-hero-nivel-badge-magenta inline-flex min-w-[7.5rem] items-center justify-center gap-2 rounded-full border border-pink-200/45 bg-gradient-to-b from-pink-300 via-fuchsia-500 to-pink-950 px-4 py-1 text-sm font-black shadow-[0_0_22px_rgba(236,72,153,0.38)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300 sm:min-w-[9rem] sm:text-base',
  elite:
    'lh-hero-nivel-badge-elite inline-flex min-w-[7.5rem] items-center justify-center gap-2 rounded-full border border-amber-100/50 bg-gradient-to-b from-amber-200 via-amber-400 to-amber-900 px-4 py-1 text-sm font-black text-amber-950 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 sm:min-w-[9rem] sm:text-base',
};

type GamificationLevelButtonProps = {
  userType: UserType;
  label: string;
  badgeVariant?: HeroBadgeVariant;
};

export function GamificationLevelButton({
  userType,
  label,
  badgeVariant = 'verde',
}: GamificationLevelButtonProps) {
  const { record, loading } = useGamification(userType);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<{ top: number; left: number; width: number } | null>(null);
  const progress = record
    ? getProgressToNextLevel(
        userType,
        record.score,
        record.stats ?? EMPTY_GAMIFICATION_STATS,
        record.levelKey,
      )
    : null;
  const missingRequirements = progress?.missingRequirements ?? [];

  useLayoutEffect(() => {
    if (!expanded || !buttonRef.current) {
      setPanelStyle(null);
      return;
    }

    const updatePanelPosition = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const width = Math.min(352, window.innerWidth - 32);
      setPanelStyle({
        top: rect.bottom + 9,
        left: rect.left + rect.width / 2,
        width,
      });
    };

    updatePanelPosition();
    window.addEventListener('resize', updatePanelPosition);
    window.addEventListener('scroll', updatePanelPosition, true);
    return () => {
      window.removeEventListener('resize', updatePanelPosition);
      window.removeEventListener('scroll', updatePanelPosition, true);
    };
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setExpanded(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [expanded]);

  const levelPanel =
    expanded && panelStyle
      ? createPortal(
          <div
            ref={panelRef}
            id="client-level-details"
            className="fixed z-[1000] -translate-x-1/2 rounded-2xl border border-lime-300/25 bg-[#061008]/95 p-3 text-left shadow-[0_18px_45px_rgba(0,0,0,0.72)] backdrop-blur-xl sm:p-4"
            style={{ top: panelStyle.top, left: panelStyle.left, width: panelStyle.width }}
          >
            <span
              className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border-l border-t border-lime-300/25 bg-[#061008]"
              aria-hidden="true"
            />
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-lime-300">
              O que falta para o próximo nível
            </p>

            {loading && !record ? (
              <div className="flex items-center gap-2 rounded-xl bg-white/[0.06] px-3 py-2.5 text-xs text-white/65">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando seu progresso...
              </div>
            ) : missingRequirements.length > 0 ? (
              <ul className="space-y-1.5">
                {missingRequirements.map((requirement) => (
                  <li
                    key={requirement}
                    className="flex items-start gap-2 rounded-xl border border-amber-300/10 bg-amber-300/10 px-3 py-2 text-xs font-semibold text-amber-100"
                  >
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
                    <span>{requirement}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-300/10 bg-emerald-300/10 px-3 py-2.5">
                <CheckCircle className="h-4 w-4 shrink-0 text-emerald-300" />
                <p className="text-xs font-bold text-emerald-100">Todos os requisitos deste nível foram concluídos.</p>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setExpanded(false);
                setTutorialOpen(true);
              }}
              className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-lime-300/25 bg-lime-400/15 px-3 py-2.5 text-xs font-black text-lime-200 transition hover:bg-lime-400/25"
            >
              <HelpCircle className="h-4 w-4" />
              {GAMIFICATION_TUTORIAL_TITLE}
            </button>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="relative z-30 mx-auto -mt-3 w-fit sm:-mt-4">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className={BADGE_BUTTON_CLASS[badgeVariant]}
        aria-expanded={expanded}
        aria-controls="client-level-details"
      >
        {label}
        <HelpCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
      </button>

      {levelPanel}

      <GamificationTutorialModal open={tutorialOpen} onClose={() => setTutorialOpen(false)} userType={userType} />
    </div>
  );
}
export function GamificationProgressCard({ userType, className = '', variant = 'card' }: Props) {
  const { record, loading } = useGamification(userType);
  const [tutorialOpen, setTutorialOpen] = useState(false);

  // Estado de carregamento
  if (loading && !record) {
    if (variant === 'hero') {
      return <div className={'h-[5.75rem] animate-pulse rounded-2xl border border-lime-400/15 bg-black/40 ' + className} />;
    }

    return (
      <LhCard className={`flex items-center justify-center gap-2 py-6 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
        <span className="text-sm font-medium text-slate-400">Carregando progresso…</span>
      </LhCard>
    );
  }

  if (!record?.levelKey) return null;

  const progress = getProgressToNextLevel(
    userType,
    record.score,
    record.stats ?? EMPTY_GAMIFICATION_STATS,
    record.levelKey,
  );
  const heroKey = record.heroKey;
  const medalSrc = MEDAL_MAP[heroKey] ?? MEDAL_MAP[`${userType}_novo`];
  const accentTheme = getProgressAccentTheme(heroKey, userType);
  const isMax = progress.nextLevel === null;

  if (variant === 'hero') {
    return (
      <div className={clsx('rounded-2xl border bg-black/40 px-3 py-2.5 text-white backdrop-blur-lg sm:px-5', accentTheme.heroBorderClass, className)}>
        <div className="flex items-center gap-2.5">
          <span className={clsx('grid h-10 w-10 shrink-0 place-items-center rounded-full border', accentTheme.iconClass)}>
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-white/65 sm:text-xs">{isMax ? 'Nível atual' : 'Próximo nível'}</p>
            <p className={clsx('truncate text-xs font-black uppercase sm:text-base', accentTheme.textClass)}>
              {isMax ? progress.currentLevel.name : progress.nextLevel?.name}
            </p>
          </div>
          <span className="text-lg font-black tabular-nums sm:text-xl">{progress.progressPercent}%</span>
        </div>
        <div className={clsx('mt-2 h-2 overflow-hidden rounded-full bg-white/[0.07]', accentTheme.heroTrackClass)}>
          <span
            className={clsx('block h-full rounded-full transition-[width] duration-500 ease-out', accentTheme.heroBarClass)}
            style={{ width: `${progress.progressPercent}%` }}
            role="progressbar"
            aria-valuenow={progress.progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={isMax ? 'Nível máximo alcançado' : `Progresso para ${progress.nextLevel?.name}`}
          />
        </div>
        <p className="mt-1.5 text-center text-[10px] text-white/55 sm:text-xs">
          {isMax ? 'Nível máximo alcançado' : formatProgressSubtitle(progress, 'hero')}
        </p>
      </div>
    );
  }

  return (
    <LhCard className={`${className}`}>
      {/* Cabeçalho: medalha + nível + score */}
      <div className="flex items-center gap-3">
        <img
          src={medalSrc}
          alt={progress.currentLevel.name}
          className="h-12 w-12 shrink-0 object-contain drop-shadow-sm sm:h-14 sm:w-14"
          loading="lazy"
          decoding="async"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            {userType === 'helper' ? 'Nível Helper' : 'Nível Cliente'}
          </p>
          <p className="truncate whitespace-nowrap text-base font-black text-slate-950 sm:text-lg">
            {progress.currentLevel.name}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Score</p>
          <p className="tabular-nums text-xl font-black text-slate-950">
            {record.score}
            <span className="text-xs font-semibold text-slate-400"> / 1000</span>
          </p>
        </div>
      </div>

      {isMax ? (
        /* Nível máximo */
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5">
          <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
          <p className="text-sm font-bold text-emerald-800">Você alcançou o nível máximo.</p>
        </div>
      ) : (
        <>
          {/* Barra de progresso */}
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1 text-xs font-bold text-slate-500">
                <TrendingUp className="h-3 w-3" />
                Próximo: {progress.nextLevel?.name}
              </span>
              <span className="tabular-nums text-xs font-black text-slate-700">
                {progress.progressPercent}%
              </span>
            </div>
            <div className={clsx('h-2 w-full overflow-hidden rounded-full', accentTheme.cardTrackClass)}>
              <div
                className={clsx('h-full rounded-full transition-[width] duration-500 ease-out', accentTheme.cardBarClass)}
                style={{ width: `${progress.progressPercent}%` }}
                role="progressbar"
                aria-valuenow={progress.progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Progresso para ${progress.nextLevel?.name}`}
              />
            </div>
            <p className="mt-1 text-right text-[11px] font-semibold text-slate-400">
              {formatProgressSubtitle(progress, 'card')}
            </p>
          </div>

          {/* Requisitos faltantes */}
          {progress.missingRequirements.length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                Faltam
              </p>
              <ul className="space-y-1.5">
                {progress.missingRequirements.map((req) => (
                  <li
                    key={req}
                    className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900"
                  >
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {/* Tutorial: como subir de nível */}
      <button
        type="button"
        onClick={() => setTutorialOpen(true)}
        className={clsx('mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-black transition', accentTheme.tutorialButtonClass)}
      >
        <HelpCircle className="h-4 w-4" />
        {GAMIFICATION_TUTORIAL_TITLE}
      </button>

      <GamificationTutorialModal
        open={tutorialOpen}
        onClose={() => setTutorialOpen(false)}
        userType={userType}
      />
    </LhCard>
  );
}
