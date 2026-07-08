import {
  AlertCircle,
  Award,
  CheckCircle,
  BadgePercent,
  Gift,
  Trophy,
  CircleAlert,
  Info,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Star,
  Rocket,
  Target,
} from 'lucide-react';
import type { GamificationTutorialCard } from '@/gamification/config/gamificationTutorialContent';
import { MEDAL_MAP } from '@/gamification/config/gamificationMedals';

import { CLIENT_LEVELS } from '@/gamification/config/clientLevels';
type Props = {
  card: GamificationTutorialCard;
  titleId?: string;
};

const LEVEL_NUMBER: Record<string, number> = {
  client_novo: 1,
  client_confiavel: 2,
  client_ouro: 3,
  client_vip: 4,
  client_elite: 5,
  helper_novo: 1,
  helper_confiavel: 2,
  helper_profissional: 3,
  helper_elite: 4,
  helper_top_helper: 5,
  helper_lenda: 6,
};

function RequirementIcon({ requirement }: { requirement: string }) {
  const normalized = requirement.toLowerCase();
  if (normalized.includes('nota') || normalized.includes('avalia')) return <Star className="h-4 w-4" />;
  if (normalized.includes('resposta') || normalized.includes('mensag')) return <MessageCircle className="h-4 w-4" />;
  if (normalized.includes('reclama') || normalized.includes('cancel')) return <CircleAlert className="h-4 w-4" />;
  if (normalized.includes('perfil')) return <ShieldCheck className="h-4 w-4" />;
  return <Target className="h-4 w-4" />;
}

function LevelSummarySlide({ card, titleId }: Props) {
  const descriptions: Record<string, string> = {
    novo: 'Começando sua jornada na LinkHelp.',
    confiavel: 'Reputação em construção e uso responsável.',
    ouro: 'Ótimo histórico e avaliações positivas.',
    vip: 'Experiência diferenciada na plataforma.',
    elite: 'Referência entre os clientes da LinkHelp.',
  };
  const benefits: Record<string, string> = {
    novo: 'Acesso à plataforma, conversas e suporte',
    confiavel: 'Mais confiança e melhores oportunidades',
    ouro: 'Mais destaque e reconhecimento',
    vip: 'Prioridade e condições diferenciadas',
    elite: 'Máxima credibilidade e benefícios exclusivos',
  };

  return (
    <div className="pb-2 text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-violet-100 text-violet-700 shadow-[0_10px_25px_rgba(109,40,217,0.16)]"><Trophy className="h-9 w-9" /></div>
      <h2 id={titleId} className="mt-3 text-[1.55rem] font-black uppercase leading-tight text-slate-950">Parabéns!<br /><span className="text-violet-700">Você chegou ao final</span></h2>
      <p className="mx-auto mt-2 max-w-[320px] text-xs font-medium leading-relaxed text-slate-500">{card.body}</p>

      <div className="mt-4 space-y-2">
        {CLIENT_LEVELS.map((level, index) => {
          const medal = MEDAL_MAP[level.heroKey];
          const tone = ['emerald', 'blue', 'amber', 'violet', 'amber'][index];
          const toneClasses: Record<string, string> = { emerald: 'border-emerald-100 bg-emerald-50/50 text-emerald-700', blue: 'border-blue-100 bg-blue-50/50 text-blue-700', amber: 'border-amber-100 bg-amber-50/50 text-amber-700', violet: 'border-violet-100 bg-violet-50/50 text-violet-700' };
          return (
            <article key={level.key} className={`grid grid-cols-[58px_minmax(0,1fr)] gap-3 rounded-2xl border p-3 text-left ${toneClasses[tone]}`}>
              <img src={medal} alt="" aria-hidden="true" className="h-14 w-14 object-contain drop-shadow-sm" />
              <div>
                <div className="flex items-start justify-between gap-2"><p className="text-xs font-black uppercase">{index + 1}. {level.name}</p><span className="shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-[8px] font-black">{level.scoreMin}{level.scoreMax < 1000 ? `–${level.scoreMax}` : '+'} pts</span></div>
                <p className="mt-1 text-[9px] font-medium leading-snug text-slate-600">{descriptions[level.key]}</p>
                <div className="mt-1.5 flex items-center gap-1.5 text-[9px] font-bold"><Award className="h-3.5 w-3.5 shrink-0" />{benefits[level.key]}</div>
              </div>
            </article>
          );
        })}
      </div>

      <section className="mt-3 grid grid-cols-[44px_minmax(0,1fr)] gap-3 rounded-2xl bg-violet-50 p-3 text-left">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-white text-violet-700"><Rocket className="h-6 w-6" /></span>
        <div><p className="text-xs font-black uppercase text-violet-700">Evolua sempre!</p><p className="mt-1 text-[10px] leading-relaxed text-slate-600">Use a LinkHelp com responsabilidade, avalie os helpers, responda às mensagens, conclua seus pedidos e evite cancelamentos.</p></div>
      </section>
    </div>
  );
}

function MaxLevelSlide({ card, titleId }: Props) {
  const medal = card.heroKey ? MEDAL_MAP[card.heroKey] : null;
  const benefitIcons = [Gift, Trophy, BadgePercent, ShieldCheck];

  return (
    <div className="pb-2 text-center">
      <div className="relative mx-auto w-fit">
        <span className="absolute -left-7 top-10 text-xl text-amber-300">✦</span>
        <span className="absolute -right-7 top-5 text-lg text-amber-300">✦</span>
        {medal ? <img src={medal} alt="" aria-hidden="true" className="h-28 w-28 object-contain drop-shadow-[0_14px_28px_rgba(217,119,6,0.28)]" /> : null}
      </div>
      <span className="inline-flex rounded-full bg-gradient-to-r from-amber-600 to-yellow-400 px-4 py-1 text-[10px] font-black uppercase tracking-wide text-white">Nível atual</span>
      <h2 id={titleId} className="mt-2 text-[1.65rem] font-black uppercase leading-tight text-amber-600">5. {card.currentLevelName}</h2>
      <p className="mt-1 text-xs font-bold text-slate-700">{card.body}</p>
      <p className="mt-1 text-[11px] font-bold text-amber-600">{card.statusCopy}</p>

      <section className="mt-4 rounded-[1.5rem] border border-amber-200 bg-amber-50/40 p-3">
        <p className="text-xs font-black uppercase text-amber-700">Seus benefícios exclusivos</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {card.exclusiveBenefits?.map((benefit, index) => {
            const Icon = benefitIcons[index % benefitIcons.length];
            return (
              <div key={benefit.title} className="rounded-xl bg-white p-2.5 text-left shadow-[0_5px_16px_rgba(146,64,14,0.07)]">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-amber-100 text-amber-600"><Icon className="h-4 w-4" /></span>
                <p className="mt-2 text-[10px] font-black leading-tight text-slate-800">{benefit.title}</p>
                <p className="mt-1 text-[9px] leading-snug text-slate-500">{benefit.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-3 rounded-[1.35rem] border border-amber-100 bg-white p-3 text-left">
        <div className="flex items-center gap-2 text-amber-700"><Trophy className="h-5 w-5" /><p className="text-xs font-black uppercase">Mantenha seus benefícios e continue evoluindo</p></div>
        <ul className="mt-2 grid gap-1.5">
          {card.maintenanceTips?.map((tip) => <li key={tip} className="flex items-center gap-2 text-[10px] font-semibold text-slate-600"><CheckCircle className="h-3.5 w-3.5 shrink-0 text-amber-600" />{tip}</li>)}
        </ul>
      </section>

      <section className="mt-3 flex items-center gap-3 rounded-[1.35rem] bg-amber-50 p-3 text-left">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-amber-600 shadow-sm"><Trophy className="h-6 w-6" /></span>
        <div><p className="text-xs font-black uppercase text-amber-700">Você é uma referência na LinkHelp!</p><p className="mt-1 text-[10px] leading-relaxed text-slate-600">{card.recognitionCopy}</p></div>
      </section>
    </div>
  );
}

function CurrentProgressSlide({ card, titleId }: Props) {
  const currentMedal = card.heroKey ? MEDAL_MAP[card.heroKey] : null;
  const nextMedal = card.nextHeroKey ? MEDAL_MAP[card.nextHeroKey] : null;
  const currentNumber = card.heroKey ? LEVEL_NUMBER[card.heroKey] : undefined;
  const isGoldTransition = card.nextHeroKey === 'client_ouro';
  const isVipTransition = card.nextHeroKey === 'client_vip';
  const isEliteTransition = card.nextHeroKey === 'client_elite';
  const currentBadgeClass = isGoldTransition
    ? 'from-blue-700 to-blue-500'
    : isVipTransition ? 'from-amber-600 to-amber-400' : isEliteTransition ? 'from-violet-700 to-purple-500' : 'from-emerald-600 to-green-500';
  const currentTitleClass = isGoldTransition
    ? 'text-blue-700'
    : isVipTransition ? 'text-amber-600' : isEliteTransition ? 'text-violet-700' : 'text-emerald-700';
  const nextTitleClass = isGoldTransition ? 'text-amber-500' : (isVipTransition || isEliteTransition) ? 'text-violet-700' : 'text-[#2563FF]';
  const nextBadgeClass = (isVipTransition || isEliteTransition) ? 'bg-violet-700' : 'bg-[#2563FF]';

  return (
    <div className="pb-2 text-center">
      <div className="relative mx-auto w-fit">
        <span className="absolute -left-5 top-7 text-lg text-amber-300">âœ¦</span>
        <span className="absolute -right-5 top-3 text-sm text-amber-300">âœ¦</span>
        {currentMedal ? (
          <img
            src={currentMedal}
            alt=""
            aria-hidden="true"
            className="h-24 w-24 object-contain drop-shadow-[0_12px_22px_rgba(22,163,74,0.22)]"
          />
        ) : null}
      </div>

      <span className={`mt-1 inline-flex rounded-full bg-gradient-to-r ${currentBadgeClass} px-4 py-1 text-[10px] font-black uppercase tracking-wide text-white shadow-sm`}>
        NÃ­vel atual
      </span>
      <h2 id={titleId} className={`mt-2 text-[1.55rem] font-black uppercase leading-tight tracking-tight ${currentTitleClass}`}>
        {currentNumber ? `${currentNumber}. ` : ''}{card.currentLevelName}
      </h2>
      <p className="mt-1 text-xs font-medium text-slate-500">{card.statusCopy}</p>

      <section className="mt-4 rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-[0_16px_45px_rgba(37,99,235,0.08)]">
        <span className={`inline-flex rounded-full ${nextBadgeClass} px-4 py-1 text-[10px] font-black uppercase tracking-wide text-white`}>
          PrÃ³ximo nÃ­vel
        </span>
        <h3 className="mt-2 text-lg font-black leading-tight text-slate-950">
          {card.title.split(card.nextLevelName ?? '')[0]}
          <span className={nextTitleClass}>{card.nextLevelName}</span>
          {card.nextLevelName ? '?' : ''}
        </h3>
        <p className="mt-1 text-[11px] font-medium text-slate-500">{card.body}</p>

        <div className="mt-3 grid grid-cols-[94px_minmax(0,1fr)] items-center gap-3">
          <div>
            {nextMedal ? (
              <img
                src={nextMedal}
                alt=""
                aria-hidden="true"
                className="mx-auto h-24 w-24 object-contain drop-shadow-[0_12px_24px_rgba(37,99,235,0.2)]"
              />
            ) : null}
            <p className="mt-1 text-[11px] font-black uppercase leading-tight text-[#2563FF]">
              {card.nextLevelName}
            </p>
          </div>

          {card.requirements && card.requirements.length > 0 ? (
            <ul className="space-y-1.5 text-left">
              {card.requirements.map((requirement) => (
                <li key={requirement} className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-2.5 py-2 shadow-[0_5px_16px_rgba(15,23,42,0.05)]">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-blue-50 text-[#2563FF]">
                    <RequirementIcon requirement={requirement} />
                  </span>
                  <span className="text-[10px] font-bold leading-snug text-slate-700">{requirement}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-3 text-left text-xs font-bold text-emerald-800">
              <CheckCircle className="h-5 w-5 shrink-0" />
              Todos os requisitos foram concluÃ­dos.
            </div>
          )}
        </div>

        <div className="mt-3 flex items-start gap-2 rounded-xl bg-blue-50 px-3 py-2.5 text-left">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#2563FF]" />
          <p className="text-[10px] font-medium leading-relaxed text-slate-600">
            Ao cumprir todos os requisitos, seu nÃ­vel serÃ¡ <strong className="text-[#2563FF]">atualizado automaticamente.</strong>
          </p>
        </div>
      </section>

      <section className={`mt-3 flex items-center gap-3 rounded-[1.35rem] border p-3 text-left ${isGoldTransition ? 'border-amber-100 bg-amber-50/60' : (isVipTransition || isEliteTransition) ? 'border-violet-100 bg-violet-50/60' : 'border-emerald-100 bg-emerald-50/60'}`}>
        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white shadow-sm ${isGoldTransition ? 'text-amber-500' : (isVipTransition || isEliteTransition) ? 'text-violet-600' : 'text-emerald-600'}`}>
          <ShieldCheck className="h-7 w-7" />
        </span>
        <div>
          <p className={`text-xs font-black ${isGoldTransition ? 'text-amber-600' : (isVipTransition || isEliteTransition) ? 'text-violet-700' : 'text-emerald-700'}`}>BenefÃ­cio de alcanÃ§ar o prÃ³ximo nÃ­vel</p>
          <p className="mt-1 text-[10px] font-medium leading-relaxed text-slate-600">{card.benefit}</p>
        </div>
      </section>
    </div>
  );
}

/** ConteÃºdo de um slide do tutorial de nÃ­veis. */
export function GamificationTutorialSlide({ card, titleId }: Props) {
  if (card.isLevelSummary) {
    return <LevelSummarySlide card={card} titleId={titleId} />;
  }

  if (card.isMaxLevel) {
    return <MaxLevelSlide card={card} titleId={titleId} />;
  }

  if (card.isCurrentProgress) {
    return <CurrentProgressSlide card={card} titleId={titleId} />;
  }

  const medalSrc = card.heroKey ? MEDAL_MAP[card.heroKey] : null;

  return (
    <>
      <div className="mx-auto flex w-full max-w-[280px] items-center justify-center rounded-[2rem] bg-white p-8 shadow-[0_24px_60px_rgba(37,99,255,0.12)] ring-1 ring-[#2563FF]/8">
        {medalSrc ? (
          <img src={medalSrc} alt="" aria-hidden="true" className="h-20 w-20 object-contain drop-shadow-md" loading="lazy" decoding="async" />
        ) : (
          <span className="flex h-20 w-20 items-center justify-center rounded-[1.35rem] bg-[#EAF2FF] text-[#2563FF]">
            <Sparkles className="h-10 w-10" />
          </span>
        )}
      </div>

      <div className="mt-8 text-center">
        <h2 id={titleId} className="text-[1.65rem] font-black leading-tight tracking-tight text-[#0B1220]">{card.title}</h2>
        <p className="mx-auto mt-3 max-w-[320px] text-sm font-medium leading-relaxed text-[#64748B]">{card.body}</p>
        {card.requirements ? (
          card.requirements.length > 0 ? (
            <ul className="mx-auto mt-4 max-w-[340px] space-y-2 text-left">
              {card.requirements.map((requirement) => (
                <li key={requirement} className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <span>{requirement}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mx-auto mt-4 flex max-w-[340px] items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-left text-xs font-bold text-emerald-800">
              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
              Todos os requisitos foram concluÃ­dos.
            </div>
          )
        ) : null}
      </div>
    </>
  );
}


