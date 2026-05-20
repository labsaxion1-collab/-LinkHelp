import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getSupabase } from '@/lib/supabase';
import { ROUTES } from '@/utils/constants';
import { pathImpliesAppMode } from '@/utils/navigation';
import {
  modeSwitchLog,
  readLastPathForMode,
  readStoredAppMode,
  rememberPathForMode,
  writeStoredAppMode,
  type AppMode,
} from '@/utils/appModeStorage';

export type { AppMode };

type Ctx = {
  mode: AppMode;
  modeSwitchBusy: boolean;
  setMode: (m: AppMode) => void;
  switchToClient: () => Promise<boolean>;
  switchToHelper: (options?: { skipHelperPrep?: boolean }) => Promise<boolean>;
  isClientMode: boolean;
  isHelperMode: boolean;
};

const AppModeContext = createContext<Ctx | null>(null);

export function AppModeProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, profile, updateProfile, refreshProfile } = useAuth();
  const [mode, setModeState] = useState<AppMode>(readStoredAppMode);
  const [modeSwitchBusy, setModeSwitchBusy] = useState(false);
  const pendingModeRef = useRef<AppMode | null>(null);

  const applyMode = useCallback((next: AppMode) => {
    pendingModeRef.current = next;
    setModeState(next);
    writeStoredAppMode(next);
    modeSwitchLog('savedMode', { savedMode: next });
  }, []);

  const setMode = useCallback(
    (m: AppMode) => {
      applyMode(m);
    },
    [applyMode],
  );

  useEffect(() => {
    const implied = pathImpliesAppMode(location.pathname);
    const pending = pendingModeRef.current;

    if (pending) {
      if (implied === pending) {
        pendingModeRef.current = null;
      } else if (!implied) {
        return;
      } else if (implied !== pending) {
        modeSwitchLog('protectedRouteDecision', {
          note: 'path_implied_mode_differs_from_pending_user_choice',
          implied,
          pending,
          pathname: location.pathname,
        });
        return;
      }
    }

    if (implied) {
      setModeState(implied);
      writeStoredAppMode(implied);
      rememberPathForMode(implied, `${location.pathname}${location.search}`);
      if (pending === implied) pendingModeRef.current = null;
    }
  }, [location.pathname, location.search]);

  const ensureHelperWorkspace = useCallback(async (): Promise<boolean> => {
    const user = session?.user;
    if (!user) return false;

    const now = new Date().toISOString();
    const sb = getSupabase();
    if (sb) {
      const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
      const currentType = typeof meta.user_type === 'string' ? meta.user_type : profile?.role ?? 'client';
      await sb.auth.updateUser({
        data: {
          ...meta,
          user_type: currentType === 'helper' ? 'helper' : currentType,
          helper_terms_accepted: true,
          helper_terms_accepted_at: now,
        },
      });
    }

    const err = await updateProfile({
      helper_terms_accepted: true,
      helper_terms_accepted_at: now,
    });
    if (err) {
      modeSwitchLog('protectedRouteDecision', {
        note: 'ensure_helper_workspace_failed',
        messageKey: err.messageKey,
      });
      return false;
    }

    await refreshProfile(user);
    return true;
  }, [session?.user, profile?.role, updateProfile, refreshProfile]);

  const switchToHelper = useCallback(
    async (options?: { skipHelperPrep?: boolean }): Promise<boolean> => {
      const currentMode = mode;
      const targetMode: AppMode = 'helper';
      modeSwitchLog('currentMode', { currentMode });
      modeSwitchLog('targetMode', { targetMode });

      setModeSwitchBusy(true);
      try {
        applyMode(targetMode);

        if (!options?.skipHelperPrep) {
          const ready = await ensureHelperWorkspace();
          if (!ready) return false;
        }

        const target = readLastPathForMode('helper') ?? ROUTES.helperDashboard;
        modeSwitchLog('navigatingTo', { navigatingTo: target });
        navigate(target, { replace: true });
        return true;
      } catch (e) {
        modeSwitchLog('protectedRouteDecision', {
          note: 'switch_to_helper_threw',
          message: e instanceof Error ? e.message : String(e),
        });
        return false;
      } finally {
        setModeSwitchBusy(false);
      }
    },
    [mode, applyMode, ensureHelperWorkspace, navigate],
  );

  const switchToClient = useCallback(async (): Promise<boolean> => {
    const currentMode = mode;
    const targetMode: AppMode = 'client';
    modeSwitchLog('currentMode', { currentMode });
    modeSwitchLog('targetMode', { targetMode });

    setModeSwitchBusy(true);
    try {
      applyMode(targetMode);
      const target = readLastPathForMode('client') ?? ROUTES.clientDashboard;
      modeSwitchLog('navigatingTo', { navigatingTo: target });
      navigate(target, { replace: true });
      return true;
    } catch (e) {
      modeSwitchLog('protectedRouteDecision', {
        note: 'switch_to_client_threw',
        message: e instanceof Error ? e.message : String(e),
      });
      return false;
    } finally {
      setModeSwitchBusy(false);
    }
  }, [mode, applyMode, navigate]);

  const value = useMemo<Ctx>(
    () => ({
      mode,
      modeSwitchBusy,
      setMode,
      switchToHelper,
      switchToClient,
      isClientMode: mode === 'client',
      isHelperMode: mode === 'helper',
    }),
    [mode, modeSwitchBusy, setMode, switchToHelper, switchToClient],
  );

  return <AppModeContext.Provider value={value}>{children}</AppModeContext.Provider>;
}

export function useAppMode(): Ctx {
  const ctx = useContext(AppModeContext);
  if (!ctx) throw new Error('useAppMode must be used within AppModeProvider');
  return ctx;
}

/** Resolve dashboard entry without requiring React — used by DashboardEntryPage. */
export function resolveEntryDashboardPath(profileRole: 'client' | 'helper' | string | undefined): string {
  const stored = readStoredAppMode();
  if (stored === 'helper') return ROUTES.helperDashboard;
  if (stored === 'client') return ROUTES.clientDashboard;
  return profileRole === 'helper' ? ROUTES.helperDashboard : ROUTES.clientDashboard;
}
