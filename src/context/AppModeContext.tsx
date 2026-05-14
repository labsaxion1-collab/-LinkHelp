import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '@/utils/constants';
import { pathImpliesAppMode } from '@/utils/navigation';

export type AppMode = 'client' | 'helper';

const STORAGE_MODE = 'linkhelp_app_mode';
const STORAGE_LAST_CLIENT = 'linkhelp_last_path_client';
const STORAGE_LAST_HELPER = 'linkhelp_last_path_helper';

type Ctx = {
  mode: AppMode;
  /** Prefer pathname when clear; otherwise last persisted mode */
  setMode: (m: AppMode) => void;
  switchToClient: () => void;
  switchToHelper: () => void;
  isClientMode: boolean;
  isHelperMode: boolean;
};

const AppModeContext = createContext<Ctx | null>(null);

function readStoredMode(): AppMode {
  try {
    const v = localStorage.getItem(STORAGE_MODE);
    if (v === 'helper' || v === 'client') return v;
  } catch {
    /* ignore */
  }
  return 'client';
}

export function AppModeProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mode, setModeState] = useState<AppMode>(readStoredMode);

  const setMode = useCallback((m: AppMode) => {
    setModeState(m);
    try {
      localStorage.setItem(STORAGE_MODE, m);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const implied = pathImpliesAppMode(location.pathname);
    if (implied) {
      setModeState(implied);
      try {
        localStorage.setItem(STORAGE_MODE, implied);
        if (implied === 'helper') {
          localStorage.setItem(STORAGE_LAST_HELPER, `${location.pathname}${location.search}`);
        }
        if (implied === 'client') {
          localStorage.setItem(STORAGE_LAST_CLIENT, `${location.pathname}${location.search}`);
        }
      } catch {
        /* ignore */
      }
    }
  }, [location.pathname, location.search]);

  const switchToHelper = useCallback(() => {
    let target: string = ROUTES.helperOpportunities;
    try {
      const last = localStorage.getItem(STORAGE_LAST_HELPER);
      if (last && last.startsWith('/helper')) target = last;
    } catch {
      /* ignore */
    }
    navigate(target);
  }, [navigate]);

  const switchToClient = useCallback(() => {
    let target: string = ROUTES.clientDashboard;
    try {
      const last = localStorage.getItem(STORAGE_LAST_CLIENT);
      if (last && last.startsWith('/client')) target = last;
    } catch {
      /* ignore */
    }
    navigate(target);
  }, [navigate]);

  const value = useMemo<Ctx>(
    () => ({
      mode,
      setMode,
      switchToHelper,
      switchToClient,
      isClientMode: mode === 'client',
      isHelperMode: mode === 'helper',
    }),
    [mode, setMode, switchToHelper, switchToClient],
  );

  return <AppModeContext.Provider value={value}>{children}</AppModeContext.Provider>;
}

export function useAppMode(): Ctx {
  const ctx = useContext(AppModeContext);
  if (!ctx) throw new Error('useAppMode must be used within AppModeProvider');
  return ctx;
}
