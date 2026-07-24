import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import {
  AuthenticatedHomeShellSkeleton,
  type AuthenticatedHomeShellVariant,
} from '@/components/home/AuthenticatedHomeShellSkeleton';
import { SnapshotHomePaint } from '@/components/home/SnapshotHomePaint';
import { useAuth } from '@/context/AuthContext';
import { isAuthenticatedHomeDashboardPath } from '@/utils/homeDashboardPaths';
import { pathImpliesAppMode } from '@/utils/navigation';
import { normalizeProfileRole } from '@/utils/userRole';
import {
  hasFreshHomeSnapshotForUser,
  readSnapshotVisibleUserId,
  writeAccountHomeSnapshot,
} from '@/utils/accountSessionSnapshot';
import { appPerfMark } from '@/utils/appPerf';

type Ctx = {
  surfaceReady: boolean;
  markSurfaceReady: () => void;
  resetSurfaceReady: () => void;
};

const HomeDashboardShellContext = createContext<Ctx | null>(null);

export function resolveHomeShellVariant(
  pathname: string,
  profileRole: ReturnType<typeof normalizeProfileRole> | null,
): AuthenticatedHomeShellVariant {
  const pathMode = pathImpliesAppMode(pathname);
  if (profileRole === 'client' || profileRole === 'helper') {
    if (pathMode && pathMode !== profileRole) return profileRole;
    return profileRole;
  }
  if (pathMode) return pathMode;
  return 'neutral';
}

function readOptimisticHomeSurfaceReady(pathname: string): boolean {
  if (!isAuthenticatedHomeDashboardPath(pathname)) return false;
  const userId = readSnapshotVisibleUserId();
  if (!userId) return false;
  return hasFreshHomeSnapshotForUser(userId);
}

export function HomeDashboardShellProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [surfaceReady, setSurfaceReady] = useState(() => readOptimisticHomeSurfaceReady(pathname));

  useEffect(() => {
    if (!isAuthenticatedHomeDashboardPath(pathname)) {
      setSurfaceReady(false);
      return;
    }
    if (readOptimisticHomeSurfaceReady(pathname)) {
      setSurfaceReady(true);
      appPerfMark('cached-home-visible');
    } else {
      setSurfaceReady(false);
    }
  }, [pathname]);

  const markSurfaceReady = useCallback(() => {
    setSurfaceReady(true);
    appPerfMark('home-interactive');
  }, []);
  const resetSurfaceReady = useCallback(() => setSurfaceReady(false), []);

  const value = useMemo(
    () => ({ surfaceReady, markSurfaceReady, resetSurfaceReady }),
    [surfaceReady, markSurfaceReady, resetSurfaceReady],
  );

  return <HomeDashboardShellContext.Provider value={value}>{children}</HomeDashboardShellContext.Provider>;
}

export function useHomeDashboardShell(): Ctx {
  const ctx = useContext(HomeDashboardShellContext);
  if (!ctx) throw new Error('useHomeDashboardShell must be used within HomeDashboardShellProvider');
  return ctx;
}

/** Marks dashboard route as painted — hides persistent home shell. */
export function useMarkHomeDashboardSurfaceReady(): void {
  const { markSurfaceReady } = useHomeDashboardShell();
  const { session, profile, sessionConfirmed } = useAuth();

  useEffect(() => {
    if (!sessionConfirmed) return;
    markSurfaceReady();
    const userId = session?.user?.id;
    if (!userId || !profile) return;
    writeAccountHomeSnapshot({
      userId,
      role: profile.role === 'helper' ? 'helper' : 'client',
      displayName: profile.name,
      avatarUrl: profile.avatar_url,
      homeConfirmed: true,
    });
  }, [markSurfaceReady, sessionConfirmed, session?.user?.id, profile]);
}

function usePersistentHomeShellVisible(): boolean {
  const { pathname } = useLocation();
  const { surfaceReady } = useHomeDashboardShell();
  const { snapshotVisible } = useAuth();

  if (!isAuthenticatedHomeDashboardPath(pathname)) return false;
  if (surfaceReady) return false;
  if (snapshotVisible) return false;
  return true;
}

/** Single home shell layer — stays mounted from auth/chunk load until dashboard surface ready. */
export function PersistentHomeDashboardShell() {
  const { pathname } = useLocation();
  const { profile } = useAuth();
  const visible = usePersistentHomeShellVisible();

  useEffect(() => {
    if (visible) appPerfMark('dashboard-shell-visible');
  }, [visible]);

  if (!visible) return null;

  const profileRole = profile ? normalizeProfileRole(profile.role) : null;
  const variant = resolveHomeShellVariant(pathname, profileRole);

  return (
    <div className="relative z-[1] w-full min-w-0 flex-1" data-lh-home-shell="persistent">
      <AuthenticatedHomeShellSkeleton variant={variant} />
    </div>
  );
}

/** Read-only snapshot paint for ProtectedRoute while session confirms. */
export function SnapshotHomeRoutePaint() {
  return (
    <>
      <SnapshotHomePaint />
      <HomeDashboardRoutePlaceholder />
    </>
  );
}

/** Occupies route outlet while persistent shell is visible (avoids duplicate skeleton JSX). */
export function HomeDashboardRoutePlaceholder() {
  return <div className="min-h-0 flex-1 shrink-0" aria-hidden data-lh-home-shell="placeholder" />;
}
