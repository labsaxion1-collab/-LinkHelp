import { useState } from 'react';
import { TrendingUp, CheckCircle, AlertCircle, Loader2, HelpCircle } from 'lucide-react';
import { LhCard } from '@/components/design-system/LhCard';
import { useGamification } from '@/gamification/hooks/useGamification';
import { getProgressToNextLevel } from '@/gamification/engines/progressEngine';
import type { UserType } from '@/gamification/types/gamification';
import { MEDAL_MAP } from '@/gamification/config/gamificationMedals';
import { GAMIFICATION_TUTORIAL_TITLE } from '@/gamification/config/gamificationTutorialContent';
import { GamificationTutorialModal } from '@/gamification/components/GamificationTutorialModal';

/** Cor da barra de progresso por hero key. */
const BAR_COLOR: Record<string, string> = {
  helper_novo: '#3B6D11',
  helper_confiavel: '#185FA5',
  helper_profissional: '#854F0B',
  helper_elite: '#185FA5',
  helper_top_helper: '#3C3489',
  helper_lenda: '#633806',
  client_novo: '#3B6D11',
  client_confiavel: '#185FA5',
  client_ouro: '#854F0B',
  client_vip: '#3C3489',
  client_elite: '#633806',
};

type Props = {
  userType: UserType;
  className?: string;
};

export function GamificationProgressCard({ userType, className = '' }: Props) {
  const { record, loading } = useGamification(userType);
  const [tutorialOpen, setTutorialOpen] = useState(false);

  // Estado de carregamento
  if (loading && !record) {
    return (
      <LhCard className={`flex items-center justify-center gap-2 py-6 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
        <span className="text-sm font-medium text-slate-400">Carregando progresso…</span>
      </LhCard>
    );
  }

  if (!record) return null;

  const progress = getProgressToNextLevel(userType, record.score, record.stats);
  const heroKey = record.heroKey;
  const medalSrc = MEDAL_MAP[heroKey] ?? MEDAL_MAP[`${userType}_novo`];
  const barColor = BAR_COLOR[heroKey] ?? '#2563FF';
  const isMax = progress.nextLevel === null;

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
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full transition-[width] duration-500 ease-out"
                style={{ width: `${progress.progressPercent}%`, background: barColor }}
                role="progressbar"
                aria-valuenow={progress.progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Progresso para ${progress.nextLevel?.name}`}
              />
            </div>
            <p className="mt-1 text-right tabular-nums text-[11px] font-semibold text-slate-400">
              {progress.pointsToNext} pts restantes
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
        className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2.5 text-xs font-black text-blue-700 transition hover:bg-blue-100/80"
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
