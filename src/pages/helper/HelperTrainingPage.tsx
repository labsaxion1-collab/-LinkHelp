import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useSessionViewer } from '@/hooks/useSessionViewer';
import { HELPER_TRAINING_LESSONS, lessonsAccessibleForTier, type TrainingLessonDef } from '@/data/helperTrainingCatalog';
import { ROUTES } from '@/utils/constants';
import { loadHelperPortfolio } from '@/utils/helperPortfolioState';
import { loadHelperProfileSettings } from '@/utils/helperProfileSettings';
import { computeHelperProfileCompletion } from '@/utils/helperProfileCompletion';
import {
  combinedProfileStrengthPercent,
  computeTrainingCertLevel,
  loadTrainingProgress,
  markLessonComplete,
  saveTrainingProgress,
  trainingCompletionRatio,
  type HelperTrainingPersist,
} from '@/utils/helperTrainingProgress';
import type { HelperSubscriptionTier } from '@/types/helperSubscription';
import { TrainingLessonDrawer } from '@/components/training/TrainingLessonDrawer';
import { TrainingCertBadge } from '@/components/training/TrainingCertBadge';

const ACHIEVEMENT_IDS = ['first_training', 'portfolio_expert', 'trusted_profile', 'video_verified'] as const;

function accessLocked(tier: HelperSubscriptionTier, lesson: TrainingLessonDef): boolean {
  return !lessonsAccessibleForTier(tier).some((l) => l.id === lesson.id);
}

export default function HelperTrainingPage() {
  const { t } = useLanguage();
  const me = useSessionViewer();
  const tier: HelperSubscriptionTier = me.subscriptionTier ?? 'BASIC';

  const [training, setTraining] = useState<HelperTrainingPersist>(() => loadTrainingProgress());
  const [activeLesson, setActiveLesson] = useState<string | null>(null);

  useEffect(() => {
    saveTrainingProgress(training);
  }, [training]);

  const profileBreakdown = computeHelperProfileCompletion(loadHelperProfileSettings());

  const trainingPct = trainingCompletionRatio(tier, training.completedLessonIds);
  const combinedPct = combinedProfileStrengthPercent(profileBreakdown.percent, tier, training.completedLessonIds);
  const certLevel = computeTrainingCertLevel(tier, training.completedLessonIds);

  const suggestions = useMemo(() => {
    const out: string[] = [];
    if (!profileBreakdown.profilePhoto) out.push(t('helper_profile_completion.suggest_avatar'));
    if (!profileBreakdown.skillsSelected) out.push(t('helper_profile_completion.suggest_skills'));
    if (trainingPct < 100) out.push(t('training.suggest_keep_learning'));
    return out.slice(0, 4);
  }, [profileBreakdown, trainingPct, t]);

  const handleMarkComplete = (lessonId: string) => {
    setTraining((prev) =>
      markLessonComplete(prev, lessonId, {
        portfolio: loadHelperPortfolio(),
        profile: loadHelperProfileSettings(),
        profileBreakdownPercent: profileBreakdown.percent,
      }),
    );
  };

  const grouped = useMemo(() => {
    return {
      free: HELPER_TRAINING_LESSONS.filter((l) => l.access === 'free'),
      essential: HELPER_TRAINING_LESSONS.filter((l) => l.access === 'pro'),
      elite: HELPER_TRAINING_LESSONS.filter((l) => l.access === 'elite'),
    };
  }, []);

  const positioning =
    tier === 'PRO_HELP'
      ? t('training.position_pro_help')
      : tier === 'ELITE'
        ? t('training.position_elite')
        : t('training.position_free');

  return (
    <div className="bg-[#f0f2f5] min-h-[calc(100vh-64px)] py-4 sm:py-8 px-4 sm:px-6">
      <div className="max-w-lg mx-auto space-y-5 pb-16">
        <div className="flex items-center gap-3">
          <Link
            to={ROUTES.helperOpportunities}
            className="p-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:text-gray-900 shadow-sm"
          >
            <Icons.ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-wider text-indigo-600">{t('training.badge')}</p>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">{t('training.page_title')}</h1>
          </div>
        </div>

        <p className="text-sm text-gray-600 font-medium leading-relaxed">{positioning}</p>

        <div className="rounded-3xl border border-white/80 bg-gradient-to-br from-white via-indigo-50/40 to-violet-50/50 p-5 shadow-sm ring-1 ring-indigo-100/60">
          <div className="flex justify-between items-start gap-3 mb-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-gray-400">{t('training.profile_strength')}</p>
              <p className="text-3xl font-black text-gray-900 mt-1">{combinedPct}%</p>
              <p className="text-[11px] text-gray-500 font-medium mt-1">{t('training.strength_sub', { training: trainingPct, profile: profileBreakdown.percent })}</p>
            </div>
            <TrainingCertBadge level={certLevel} size="md" />
          </div>
          <div className="h-2 rounded-full bg-gray-200 overflow-hidden mb-4">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
              style={{ width: `${combinedPct}%` }}
            />
          </div>
          {suggestions.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{t('training.suggestions_title')}</p>
              <ul className="text-xs text-gray-700 space-y-1 font-medium">
                {suggestions.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <Icons.ArrowRight className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2 px-1">{t('training.achievements_title')}</p>
          <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
            {ACHIEVEMENT_IDS.map((id) => {
              const unlocked = training.achievementIds.includes(id);
              return (
                <div
                  key={id}
                  className={`shrink-0 px-3 py-2 rounded-2xl border text-[11px] font-bold flex items-center gap-1.5 ${
                    unlocked
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-gray-100 border-gray-200 text-gray-400'
                  }`}
                >
                  <Icons.Medal className="w-3.5 h-3.5" />
                  {t(`training.achievement_${id}`)}
                </div>
              );
            })}
          </div>
        </div>

        <TrainingSection
          title={t('training.section_free')}
          subtitle={t('training.section_free_sub')}
          lessons={grouped.free}
          tier={tier}
          completed={training.completedLessonIds}
          onOpen={setActiveLesson}
        />

        <div className="relative rounded-3xl border border-purple-100 bg-white p-4 shadow-sm overflow-hidden">
          {(tier === 'BASIC' || tier === 'ELITE') && (
            <div className="absolute inset-0 z-10 bg-white/75 backdrop-blur-[2px] flex flex-col items-center justify-center text-center p-6">
              <Icons.Lock className="w-8 h-8 text-purple-600 mb-2" />
              <p className="text-sm font-black text-gray-900 mb-1">{t('training.locked_essential_title')}</p>
              <p className="text-xs text-gray-600 mb-4 font-medium">{t('training.locked_essential_body')}</p>
              <Link
                to={ROUTES.helperOpportunities}
                className="min-h-[48px] px-6 rounded-2xl bg-purple-600 text-white text-sm font-black hover:bg-purple-700 shadow-md"
              >
                {t('training.cta_upgrade_pro_help')}
              </Link>
            </div>
          )}
          <TrainingSection
            title={t('training.section_essential')}
            subtitle={t('training.section_essential_sub')}
            lessons={grouped.essential}
            tier={tier}
            completed={training.completedLessonIds}
            onOpen={setActiveLesson}
          />
        </div>

        <div className="relative rounded-3xl border border-amber-100 bg-white p-4 shadow-sm overflow-hidden">
          {tier === 'BASIC' && (
            <div className="absolute inset-0 z-10 bg-white/75 backdrop-blur-[2px] flex flex-col items-center justify-center text-center p-6">
              <Icons.Crown className="w-8 h-8 text-amber-600 mb-2" />
              <p className="text-sm font-black text-gray-900 mb-1">{t('training.locked_elite_title')}</p>
              <p className="text-xs text-gray-600 mb-4 font-medium">{t('training.locked_elite_body')}</p>
              <Link
                to={ROUTES.helperOpportunities}
                className="min-h-[48px] px-6 rounded-2xl bg-amber-500 text-amber-950 text-sm font-black hover:bg-amber-400 shadow-md"
              >
                {t('training.cta_upgrade_elite')}
              </Link>
            </div>
          )}
          <TrainingSection
            title={t('training.section_elite')}
            subtitle={t('training.section_elite_sub')}
            lessons={grouped.elite}
            tier={tier}
            completed={training.completedLessonIds}
            onOpen={setActiveLesson}
          />
        </div>

        <p className="text-[11px] text-center text-gray-400 font-medium px-4 leading-relaxed">{t('training.footer_future')}</p>
      </div>

      <TrainingLessonDrawer
        lessonId={activeLesson}
        open={Boolean(activeLesson)}
        onClose={() => setActiveLesson(null)}
        onMarkComplete={handleMarkComplete}
        alreadyComplete={activeLesson ? training.completedLessonIds.includes(activeLesson) : false}
      />
    </div>
  );
}

function TrainingSection({
  title,
  subtitle,
  lessons,
  tier,
  completed,
  onOpen,
}: {
  title: string;
  subtitle: string;
  lessons: TrainingLessonDef[];
  tier: HelperSubscriptionTier;
  completed: string[];
  onOpen: (id: string) => void;
}) {
  const { t } = useLanguage();
  const doneSet = new Set(completed);

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-black text-gray-900">{title}</h2>
        <p className="text-xs text-gray-500 font-medium mt-0.5">{subtitle}</p>
      </div>
      <div className="space-y-2">
        {lessons.map((lesson) => {
          const locked = accessLocked(tier, lesson);
          const done = doneSet.has(lesson.id);
          return (
            <button
              key={lesson.id}
              type="button"
              disabled={locked}
              onClick={() => !locked && onOpen(lesson.id)}
              className={`w-full text-left rounded-2xl border p-4 flex items-start gap-3 transition-all min-h-[72px] ${
                locked
                  ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                  : 'border-gray-100 bg-white hover:border-indigo-200 hover:shadow-md active:scale-[0.99]'
              }`}
            >
              <div
                className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                  done ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-50 text-indigo-700'
                }`}
              >
                {done ? <Icons.Check className="w-5 h-5" strokeWidth={3} /> : <Icons.BookOpen className="w-5 h-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">{t(`training.lessons.${lesson.id}.title`)}</p>
                <p className="text-[11px] text-gray-500 font-semibold mt-1">
                  {locked ? t('training.locked_short') : t('training.duration_line', { sec: lesson.durationSec })}
                </p>
              </div>
              {!locked && <Icons.ChevronRight className="w-5 h-5 text-gray-300 shrink-0 mt-1" />}
              {locked && <Icons.Lock className="w-4 h-4 text-gray-400 shrink-0 mt-1" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
