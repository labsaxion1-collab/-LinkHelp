import React, { createContext, useContext, useMemo } from 'react';

type ThemeMode = 'light';

interface ThemeContextValue {
  mode: ThemeMode;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo(() => ({ mode: 'light' as const }), []);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
