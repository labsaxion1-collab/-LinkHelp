import { DynamicHeroRenderer } from '@/gamification/components/DynamicHeroRenderer';
import { AppHomeClientQuickStrip } from '@/components/home/AppHomeClientQuickStrip';
import {
  readAccountHomeSnapshot,
  readAccountSessionHint,
  type AccountHomeSnapshot,
} from '@/utils/accountSessionSnapshot';
import { EMPTY_GAMIFICATION_STATS } from '@/gamification/services/gamificationStatsAdapter';
import type { UserGamificationRecord } from '@/gamification/services/gamificationService';
import { appPerfMark } from '@/utils/appPerf';
import { useEffect } from 'react';

function visualRecordFromSnapshot(snap: AccountHomeSnapshot): UserGamificationRecord | null {
  if (!snap.heroKey || !snap.levelKey) return null;
  return {
    userId: snap.userId,
    userType: snap.role,
    score: 0,
    levelKey: snap.levelKey,
    heroKey: snap.heroKey,
    stats: EMPTY_GAMIFICATION_STATS,
    progressPercent: 0,
    pointsToNextLevel: 0,
    missingRequirements: [],
    updatedAt: '',
  };
}

/**
 * Read-only Home appearance while Supabase session is still confirming.
 * No mutations, no private detail sheets, no actionable CTAs.
 */
export function SnapshotHomePaint() {
  const hint = readAccountSessionHint();
  const snap = hint ? readAccountHomeSnapshot(hint.userId) : null;

  useEffect(() => {
    if (snap) appPerfMark('cached-home-visible');
  }, [snap]);

  if (!snap) return null;

  const record = visualRecordFromSnapshot(snap);
  const isHelper = snap.role === 'helper';

  return (
    <div
      className="pointer-events-none relative z-[1] w-full min-w-0 flex-1 select-none"
      data-lh-home-shell="snapshot-paint"
      aria-busy="true"
      aria-live="polite"
      aria-label="Confirmando sessão"
    >
      {record ? (
        <DynamicHeroRenderer
          userType={snap.role}
          gamification={record}
          gamificationLoading={false}
          gamificationError={false}
          avatarUrl={snap.avatarUrl}
          balance={null}
          completedServices={0}
          satisfactionRate={0}
          rating={0}
          connectedProfessionals={0}
        />
      ) : null}

      {!isHelper ? (
        <div className="mx-auto w-full max-w-[680px] px-4 pt-4 opacity-90 md:max-w-6xl sm:px-6 md:px-8">
          <AppHomeClientQuickStrip
            activeJobsCount={snap.activeJobsCount}
            pendingApplicationsCount={snap.pendingApplicationsCount}
            upcomingServicesCount={snap.upcomingServicesCount}
            creditsBalance={null}
            creditsLoading
            onOpenActiveServices={() => {}}
            onOpenMessages={() => {}}
            onCreateRequest={() => {}}
          />
        </div>
      ) : (
        <div className="mx-auto mt-4 w-full max-w-[680px] px-4 md:max-w-6xl sm:px-6 md:px-8" aria-hidden>
          <div className="h-16 animate-pulse rounded-2xl bg-slate-100/80" />
          <div className="mt-3 h-24 animate-pulse rounded-2xl bg-slate-100/70" />
        </div>
      )}
    </div>
  );
}
