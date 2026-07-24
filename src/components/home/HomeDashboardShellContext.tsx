import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useLocation } from 'react-router-dom';
import {
  AuthenticatedHomeShellSkeleton,
  type AuthenticatedHomeShellVariant,
} from '@/components/home/AuthenticatedHomeShellSkeleton';
import { SnapshotHomePaint } from '@/components/home/SnapshotHomePaint';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { isAuthenticatedHomeDashboardPath } from '@/utils/homeDashboardPaths';
import { pathImpliesAppMode } from '@/utils/navigation';
import { normalizeProfileRole } from '@/utils/userRole';
import {
  hasFreshHomeSnapshotForUser,
  readSnapshotVisibleUserId,
  writeAccountHomeSnapshot,
} from '@/utils/accountSessionSnapshot';
import { appPerfMark } from '@/utils/appPerf';
import { ROUTES } from '@/utils/constants';

type Ctx = {
  surfaceReady: boolean;
  markSurfaceReady: () => void;
  resetSurfaceReady: () => void;
  /** Monotonic generation — StrictMode remounts must not clear a newer mark. */
  surfaceGeneration: number;
};

const HomeDashboardShellContext = createContext<Ctx | null>(null);

/** After this, reveal a recoverable error instead of an infinite black shell. */
const SHELL_STUCK_MS = 12_000;

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

function homePathFamily(pathname: string): 'client' | 'helper' | 'other' {
  if (pathname.startsWith('/helper')) return 'helper';
  if (pathname.startsWith('/client')) return 'client';
  return 'other';
}

export function HomeDashboardShellProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { sessionConfirmed, session, profile } = useAuth();
  const [surfaceReady, setSurfaceReady] = useState(() => readOptimisticHomeSurfaceReady(pathname));
  const generationRef = useRef(0);
  const [surfaceGeneration, setSurfaceGeneration] = useState(0);
  const lastFamilyRef = useRef(homePathFamily(pathname));
  const lastUserIdRef = useRef<string | null>(session?.user?.id ?? null);

  // Account switch / logout: drop surface so the next user never inherits ready.
  useEffect(() => {
    const uid = session?.user?.id ?? null;
    if (uid !== lastUserIdRef.current) {
      lastUserIdRef.current = uid;
      generationRef.current += 1;
      setSurfaceGeneration(generationRef.current);
      if (!uid) {
        setSurfaceReady(false);
      } else if (readOptimisticHomeSurfaceReady(pathname)) {
        setSurfaceReady(true);
      } else {
        setSurfaceReady(false);
      }
    }
  }, [session?.user?.id, pathname]);

  useEffect(() => {
    if (!isAuthenticatedHomeDashboardPath(pathname)) {
      setSurfaceReady(false);
      lastFamilyRef.current = homePathFamily(pathname);
      return;
    }

    const family = homePathFamily(pathname);
    const familyChanged = family !== lastFamilyRef.current;
    lastFamilyRef.current = family;

    if (readOptimisticHomeSurfaceReady(pathname)) {
      setSurfaceReady(true);
      appPerfMark('cached-home-visible');
      return;
    }

    // Soft navigation within the same role home: keep ready if dashboard already painted.
    // Only force shell when entering home fresh or switching client ↔ helper.
    if (familyChanged) {
      setSurfaceReady(false);
    }
  }, [pathname]);

  // If optimistic ready relied on a snapshot that vanished (race), fall back to shell —
  // never leave Navbar + empty light main.
  useEffect(() => {
    if (sessionConfirmed) return;
    if (!isAuthenticatedHomeDashboardPath(pathname)) return;
    if (!surfaceReady) return;
    if (readSnapshotVisibleUserId()) return;
    setSurfaceReady(false);
  }, [sessionConfirmed, pathname, surfaceReady]);

  // Once session+profile confirmed, do not keep an empty shell forever if the
  // dashboard chunk is slow — shell stays until markSurfaceReady, failsafe UI handles stuck.
  useEffect(() => {
    if (!sessionConfirmed || !profile) return;
    if (!isAuthenticatedHomeDashboardPath(pathname)) return;
    if (typeof window !== 'undefined') {
      try {
        if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
      } catch {
        /* ignore */
      }
      window.scrollTo(0, 0);
    }
  }, [sessionConfirmed, profile, pathname]);

  const markSurfaceReady = useCallback(() => {
    generationRef.current += 1;
    setSurfaceGeneration(generationRef.current);
    setSurfaceReady(true);
    appPerfMark('home-interactive');
  }, []);

  const resetSurfaceReady = useCallback(() => {
    generationRef.current += 1;
    setSurfaceGeneration(generationRef.current);
    setSurfaceReady(false);
  }, []);

  const value = useMemo(
    () => ({ surfaceReady, markSurfaceReady, resetSurfaceReady, surfaceGeneration }),
    [surfaceReady, markSurfaceReady, resetSurfaceReady, surfaceGeneration],
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
  const markedForUserRef = useRef<string | null>(null);

  // useLayoutEffect so shell hides before paint when dashboard mounts (no black flash).
  useLayoutEffect(() => {
    if (!sessionConfirmed) return;
    const userId = session?.user?.id ?? null;
    markSurfaceReady();
    if (!userId || !profile) return;
    if (markedForUserRef.current === userId) {
      // Still mark ready every mount (StrictMode / remount) but avoid snapshot spam.
    } else {
      markedForUserRef.current = userId;
    }
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
  const { snapshotVisible, sessionConfirmed } = useAuth();

  if (!isAuthenticatedHomeDashboardPath(pathname)) return false;
  if (surfaceReady) return false;
  // Snapshot paint owns the visual while session confirms — do not stack dark shell on top.
  if (snapshotVisible && !sessionConfirmed) return false;
  return true;
}

function HomeShellStuckFallback({ onRetry }: { onRetry: () => void }) {
  const { t } = useLanguage();
  const { signOut } = useAuth();

  return (
    <div
      className="relative z-[1] flex w-full min-w-0 flex-1 flex-col items-center justify-center gap-4 bg-[#F8FAFC] px-4 py-16 text-center"
      data-lh-home-shell="stuck-fallback"
      role="alert"
    >
      <p className="text-sm font-semibold text-slate-700">
        {t('auth.profile_load_failed')}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-black"
          onClick={onRetry}
        >
          {t('common.try_again')}
        </button>
        <button
          type="button"
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
          onClick={() => {
            void signOut().then(() => {
              window.location.assign(ROUTES.login);
            });
          }}
        >
          {t('nav.logout')}
        </button>
      </div>
    </div>
  );
}

/** Single home shell layer — stays mounted from auth/chunk load until dashboard surface ready. */
export function PersistentHomeDashboardShell() {
  const { pathname } = useLocation();
  const { profile, sessionConfirmed, refreshProfile, session } = useAuth();
  const { surfaceReady, resetSurfaceReady } = useHomeDashboardShell();
  const visible = usePersistentHomeShellVisible();
  const [stuck, setStuck] = useState(false);
  const visibleSinceRef = useRef<number | null>(null);

  useEffect(() => {
    if (visible) appPerfMark('dashboard-shell-visible');
  }, [visible]);

  useEffect(() => {
    if (!visible || surfaceReady) {
      visibleSinceRef.current = null;
      setStuck(false);
      return;
    }
    if (visibleSinceRef.current == null) visibleSinceRef.current = Date.now();
    const started = visibleSinceRef.current;
    const timer = window.setTimeout(() => {
      if (visibleSinceRef.current === started) {
        setStuck(true);
        appPerfMark('home-shell-stuck');
        if (import.meta.env.DEV || import.meta.env.MODE === 'production') {
          console.warn('[LinkHelp] Home shell stuck', {
            path: pathname,
            sessionConfirmed,
            hasProfile: Boolean(profile),
          });
        }
      }
    }, SHELL_STUCK_MS);
    return () => window.clearTimeout(timer);
  }, [visible, surfaceReady, pathname, sessionConfirmed, profile]);

  if (!visible) return null;

  if (stuck) {
    return (
      <HomeShellStuckFallback
        onRetry={() => {
          setStuck(false);
          visibleSinceRef.current = Date.now();
          resetSurfaceReady();
          if (session?.user) void refreshProfile(session.user);
          else window.location.reload();
        }}
      />
    );
  }

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
