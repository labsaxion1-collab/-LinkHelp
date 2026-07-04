import { useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';
import type { UserType } from '@/gamification/types/gamification';
import { getGamificationTutorialCards } from '@/gamification/config/gamificationTutorialContent';
import { MEDAL_MAP } from '@/gamification/config/gamificationMedals';

type Props = {
  userType: UserType;
};

/** Tutorial em cards navegáveis explicando como subir de nível. */
export function GamificationTutorial({ userType }: Props) {
  const cards = getGamificationTutorialCards(userType);
  const [step, setStep] = useState(0);

  const card = cards[step];
  const medalSrc = card.heroKey ? MEDAL_MAP[card.heroKey] : null;
  const isFirst = step === 0;
  const isLast = step === cards.length - 1;

  return (
    <div className="flex flex-col items-center">
      {/* Card atual */}
      <div className="flex min-h-[260px] w-full flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-slate-50 to-blue-50/60 px-5 py-6 text-center ring-1 ring-slate-100">
        {medalSrc ? (
          <img
            src={medalSrc}
            alt=""
            aria-hidden="true"
            className="h-20 w-20 object-contain drop-shadow-md sm:h-24 sm:w-24"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 sm:h-24 sm:w-24">
            <Sparkles className="h-9 w-9 text-blue-600" />
          </span>
        )}
        <h3 className="mt-4 text-lg font-black leading-snug text-slate-950">{card.title}</h3>
        <p className="mt-2 max-w-[22rem] text-sm font-medium leading-6 text-slate-600">{card.body}</p>
      </div>

      {/* Indicadores */}
      <div className="mt-4 flex items-center gap-1.5" role="tablist" aria-label="Etapas do tutorial">
        {cards.map((item, index) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={index === step}
            aria-label={item.title}
            onClick={() => setStep(index)}
            className={clsx(
              'h-2 rounded-full transition-all',
              index === step ? 'w-6 bg-blue-600' : 'w-2 bg-slate-200 hover:bg-slate-300',
            )}
          />
        ))}
      </div>

      {/* Navegação */}
      <div className="mt-4 flex w-full items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setStep((value) => Math.max(0, value - 1))}
          disabled={isFirst}
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </button>
        <span className="tabular-nums text-xs font-bold text-slate-400">
          {step + 1} / {cards.length}
        </span>
        <button
          type="button"
          onClick={() => setStep((value) => Math.min(cards.length - 1, value + 1))}
          disabled={isLast}
          className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-[0_8px_20px_rgba(37,99,255,0.25)] transition hover:brightness-105 disabled:opacity-40"
        >
          Próximo
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
