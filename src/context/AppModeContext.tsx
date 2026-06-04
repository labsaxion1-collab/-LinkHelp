import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { authFlowLog } from '@/lib/authDebug';
import {
  type AppMode,
  modeSwitchLog,
  readLastPathForMode,
  readStoredAppMode,
  rememberPathForMode,
  writeStoredAppMode,
} from '@/utils/appModeStorage';
import { pathImpliesAppMode } from '@/utils/navigation';
import { dashboardPathForRole, normalizeProfileRole, resolveEffectiveRole } from '@/utils/userRole';

type Ctx = {
  mode: AppMode;
  isClientMode: boolean;
  isHelperMode: boolean;
  profileRole: AppMode;
  setMode: (next: AppMode) => void;
};

const AppModeContext = createContext<Ctx | null>(null);

/** Active workspace mode (Client/Help) — persisted per user; defaults to Client. */
export function AppModeProvider({ children }: { children: React.ReactNode }) {
  const { profile, session, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const userId = session?.user?.id ?? null;
  const profileRole = normalizeProfileRole(profile?.role);

  const [mode, setModeState] = useState<AppMode>(() => {
    const stored = readStoredAppMode(userId);
    return resolveEffectiveRole(profile, user ?? session?.user, stored);
  });

  useEffect(() => {
    if (!userId) {
      setModeState('client');
      return;
    }

    const pathMode = pathImpliesAppMode(location.pathname);
    if (pathMode) {
      setModeState((prev) => {
        if (prev !== pathMode) {
          authFlowLog('App mode synced from route', {
            userId,
            path: location.pathname,
            mode: pathMode,
            profileRole,
          });
        }
        return pathMode;
      });
      writeStoredAppMode(pathMode, userId);
      rememberPathForMode(pathMode, location.pathname);
      return;
    }

    const stored = readStoredAppMode(userId);
    const effective = resolveEffectiveRole(profile, user ?? session?.user, stored);
    setModeState((prev) => {
      if (prev !== effective) {
        authFlowLog('App mode resolved from profile/metadata', {
          userId,
          effective,
          stored,
          profileRole,
        });
      }
      return effective;
    });
    if (!stored) writeStoredAppMode(effective, userId);
  }, [userId, profile?.role, location.pathname, profile, user, session?.user, profileRole]);

  const setMode = useCallback(
    (next: AppMode) => {
      if (!userId) return;
      modeSwitchLog('switch', { from: mode, to: next, profileRole, userId });
      authFlowLog('User switched workspace mode', { from: mode, to: next, profileRole, userId });
      writeStoredAppMode(next, userId);
      setModeState(next);
      const last = readLastPathForMode(next);
      const dest = last ?? dashboardPathForRole(next);
      authFlowLog('Post-switch navigation', { dest, mode: next });
      navigate(dest, { replace: true });
    },
    [mode, navigate, profileRole, userId],
  );

  const value = useMemo<Ctx>(
    () => ({
      mode,
      isClientMode: mode === 'client',
      isHelperMode: mode === 'helper',
      profileRole,
      setMode,
    }),
    [mode, profileRole, setMode],
  );

  return <AppModeContext.Provider value={value}>{children}</AppModeContext.Provider>;
}

export function useAppMode(): Ctx {
  const ctx = useContext(AppModeContext);
  if (!ctx) throw new Error('useAppMode must be used within AppModeProvider');
  return ctx;
}

export { dashboardPathForRole as resolveEntryDashboardPath } from '@/utils/userRole';
