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
import { Briefcase } from 'lucide-react';

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
 * Shows same-account cached hero / LC / QuickStrip / up to 3 feed previews.
 */
export function SnapshotHomePaint() {
  const hint = readAccountSessionHint();
  const snap = hint ? readAccountHomeSnapshot(hint.userId) : null;

  useEffect(() => {
    if (!snap) return;
    appPerfMark('cached-home-visible');
    if (snap.heroKey) appPerfMark('cached-hero-visible');
    if (snap.lcBalanceVisual != null) appPerfMark('cached-balance-visible');
  }, [snap]);

  if (!snap) return null;

  const record = visualRecordFromSnapshot(snap);
  const isHelper = snap.role === 'helper';
  const cachedBalance = snap.lcBalanceVisual;
  const previews = snap.feedPreviews.slice(0, 3);

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
          balance={cachedBalance}
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
            creditsBalance={cachedBalance}
            creditsLoading={cachedBalance == null}
            onOpenActiveServices={() => {}}
            onOpenMessages={() => {}}
            onCreateRequest={() => {}}
          />
          {previews.length > 0 ? (
            <div className="mt-6 space-y-3" data-lh-home-feed="snapshot-previews">
              {previews.map((item) => (
                <div
                  key={item.id}
                  className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-left shadow-sm"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate whitespace-nowrap text-sm font-black text-[#0B1220]">
                      {item.title}
                    </p>
                    <p className="truncate whitespace-nowrap text-xs font-semibold text-slate-500">
                      {item.budgetLabel ?? '—'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mx-auto mt-4 w-full max-w-[680px] px-4 md:max-w-6xl sm:px-6 md:px-8">
          {previews.length > 0 ? (
            <div className="space-y-3 opacity-90" data-lh-home-feed="snapshot-previews">
              {previews.map((item) => (
                <div
                  key={item.id}
                  className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate whitespace-nowrap text-sm font-black text-[#0B1220]">
                      {item.title}
                    </p>
                    <p className="truncate whitespace-nowrap text-xs font-semibold text-slate-500">
                      {item.budgetLabel ?? '—'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div aria-hidden>
              <div className="h-16 animate-pulse rounded-2xl bg-slate-100/80" />
              <div className="mt-3 h-24 animate-pulse rounded-2xl bg-slate-100/70" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
