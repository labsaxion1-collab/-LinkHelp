import React, { createContext, useContext, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import type { AppMode } from '@/utils/appModeStorage';

type Ctx = {
  mode: AppMode;
  isClientMode: boolean;
  isHelperMode: boolean;
};

const AppModeContext = createContext<Ctx | null>(null);

/** App shell mode is fixed from the account role — no client/helper switching. */
export function AppModeProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const mode: AppMode = profile?.role === 'helper' ? 'helper' : 'client';

  const value = useMemo<Ctx>(
    () => ({
      mode,
      isClientMode: mode === 'client',
      isHelperMode: mode === 'helper',
    }),
    [mode],
  );

  return <AppModeContext.Provider value={value}>{children}</AppModeContext.Provider>;
}

export function useAppMode(): Ctx {
  const ctx = useContext(AppModeContext);
  if (!ctx) throw new Error('useAppMode must be used within AppModeProvider');
  return ctx;
}

export { dashboardPathForRole as resolveEntryDashboardPath } from '@/utils/userRole';
