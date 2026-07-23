import { useState } from 'react';
import { ChevronRight, Eye, Loader2, ShieldCheck, Zap } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useGamification } from '@/gamification/hooks/useGamification';
import { MEDAL_MAP } from '@/gamification/config/gamificationMedals';
import { getProgressToNextLevel } from '@/gamification/engines/progressEngine';
import { EMPTY_GAMIFICATION_STATS } from '@/gamification/services/gamificationStatsAdapter';
import type { UserType } from '@/gamification/types/gamification';
import { ProfileSectionHeader } from '@/components/profile/ProfileSectionHeader';
import { GamificationTutorialModal } from '@/gamification/components/GamificationTutorialModal';

type Props = {
  userType: UserType;
};

function shortLevelName(name: string) {
  return name
    .replace(/^Cliente\s+/i, '')
    .replace(/^Helper\s+/i, '')
    .replace(/^Lenda\s+LinkHelp$/i, 'Lenda')
    .replace(/^Top\s+Helper$/i, 'Top Helper')
    .trim();
}

const BENEFIT_KEYS = [
  { icon: Eye, key: 'profile_page.level_benefit_visibility' },
  { icon: Zap, key: 'profile_page.level_benefit_priority' },
  { icon: ShieldCheck, key: 'profile_page.level_benefit_credibility' },
] as const;

export function ProfileGamificationSection({ userType }: Props) {
  const { t } = useLanguage();
  const { record, loading } = useGamification(userType);
  const [tutorialOpen, setTutorialOpen] = useState(false);

  if (loading && !record) {
    return (
      <section>
        <ProfileSectionHeader title={t('profile_page.section_level')} />
        <div className="flex h-36 items-center justify-center rounded-[1.5rem] border border-slate-200/90 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" aria-hidden />
        </div>
      </section>
    );
  }

  const progress = getProgressToNextLevel(
    userType,
    record?.score ?? 0,
    record?.stats ?? EMPTY_GAMIFICATION_STATS,
    record?.levelKey ?? 'novo',
  );
  const heroKey = record?.heroKey ?? `${userType}_novo`;
  const medalSrc = MEDAL_MAP[heroKey] ?? MEDAL_MAP[`${userType}_novo`];
  const currentName = shortLevelName(progress.currentLevel.name);
  const nextName = progress.nextLevel ? shortLevelName(progress.nextLevel.name) : null;
  const nextHeroKey = progress.nextLevel?.heroKey;
  const nextMedal = nextHeroKey ? MEDAL_MAP[nextHeroKey] : null;
  const score = record?.score ?? 0;
  const isMax = progress.nextLevel === null;

  return (
    <section>
      <ProfileSectionHeader title={t('profile_page.section_level')} />
      <button
        type="button"
        onClick={() => setTutorialOpen(true)}
        className="w-full rounded-[1.5rem] border border-slate-200/90 bg-white p-4 text-left shadow-[0_12px_32px_rgba(15,23,42,0.055)] transition hover:border-blue-100"
      >
        <div className="flex items-start gap-3">
          <img
            src={medalSrc}
            alt=""
            className="h-14 w-14 shrink-0 object-contain drop-shadow-sm"
            loading="lazy"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xl font-black text-slate-950">{currentName}</p>
                <p className="mt-0.5 text-sm font-bold text-slate-500">
                  {t('profile_page.level_score', { score, max: 1000 })}
                </p>
              </div>
              {!isMax && nextName ? (
                <div className="shrink-0 text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    {t('profile_page.next_level')}
                  </p>
                  <div className="mt-1 inline-flex items-center gap-1.5">
                    {nextMedal ? (
                      <img src={nextMedal} alt="" className="h-5 w-5 object-contain" loading="lazy" />
                    ) : null}
                    <span className="text-sm font-black text-[#7C3AED]">{nextName}</span>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-3">
              <div className="relative h-7 overflow-hidden rounded-full bg-[#E8EEF9]">
                <div
                  className="absolute inset-y-0 left-0 flex items-center justify-center rounded-full bg-[#2563FF] transition-[width]"
                  style={{ width: `${Math.max(12, progress.progressPercent)}%` }}
                >
                  {progress.progressPercent >= 28 ? (
                    <span className="text-[11px] font-black text-white">
                      {progress.progressPercent}%
                    </span>
                  ) : null}
                </div>
                {progress.progressPercent < 28 ? (
                  <span className="absolute inset-0 flex items-center justify-center text-[11px] font-black text-slate-600">
                    {progress.progressPercent}%
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3.5 flex flex-wrap gap-2">
          {BENEFIT_KEYS.map(({ icon: Icon, key }) => (
            <span
              key={key}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-[#F8FAFF] px-2.5 py-1 text-[10px] font-bold text-slate-600"
            >
              <Icon className="h-3 w-3 text-[#2563FF]" aria-hidden />
              {t(key)}
            </span>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <p className="text-xs font-semibold text-slate-500">
            {isMax
              ? t('profile_page.level_max_reached')
              : t('profile_page.level_points_remaining', {
                  points: progress.pointsToNext,
                  level: nextName ?? '',
                })}
          </p>
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
        </div>
      </button>

      <GamificationTutorialModal
        open={tutorialOpen}
        onClose={() => setTutorialOpen(false)}
        userType={userType}
      />
    </section>
  );
}
