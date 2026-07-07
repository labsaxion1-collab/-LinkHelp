import { Sparkles } from 'lucide-react';
import type { GamificationTutorialCard } from '@/gamification/config/gamificationTutorialContent';
import { MEDAL_MAP } from '@/gamification/config/gamificationMedals';

type Props = {
  card: GamificationTutorialCard;
  titleId?: string;
};

/** Conteúdo de um slide — mesmo layout do tutorial da barra superior (helper flow). */
export function GamificationTutorialSlide({ card, titleId }: Props) {
  const medalSrc = card.heroKey ? MEDAL_MAP[card.heroKey] : null;

  return (
    <>
      <div className="mx-auto flex w-full max-w-[280px] items-center justify-center rounded-[2rem] bg-white p-8 shadow-[0_24px_60px_rgba(37,99,255,0.12)] ring-1 ring-[#2563FF]/8">
        {medalSrc ? (
          <img
            src={medalSrc}
            alt=""
            aria-hidden="true"
            className="h-20 w-20 object-contain drop-shadow-md"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span className="flex h-20 w-20 items-center justify-center rounded-[1.35rem] bg-[#EAF2FF] text-[#2563FF]">
            <Sparkles className="h-10 w-10" />
          </span>
        )}
      </div>

      <div className="mt-8 text-center">
        <h2
          id={titleId}
          className="text-[1.65rem] font-black leading-tight tracking-tight text-[#0B1220]"
        >
          {card.title}
        </h2>
        <p className="mx-auto mt-3 max-w-[320px] text-sm font-medium leading-relaxed text-[#64748B]">
          {card.body}
        </p>
      </div>
    </>
  );
}
