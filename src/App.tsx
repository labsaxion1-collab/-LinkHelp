/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Route table and lazy-loaded pages live in `src/routes/AppRoutes.tsx`.
 */

import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { LanguageProvider } from '@/context/LanguageContext';
import { AppDataProvider } from '@/context/AppDataContext';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { AppModeProvider } from '@/context/AppModeContext';
import { CreditProvider } from '@/context/CreditContext';
import { ServiceReviewProvider } from '@/context/ServiceReviewContext';
import { AppRoutes } from '@/routes/AppRoutes';
import { checkSupabaseConnection, isSupabaseConfigured } from '@/lib/supabase';
import { authDevLog } from '@/lib/authDebug';

function DevSupabasePing() {
  useEffect(() => {
    if (!import.meta.env.DEV || !isSupabaseConfigured()) return;
    void checkSupabaseConnection().then((r) => {
      authDevLog('checkSupabaseConnection', { ok: r.ok, error: r.error });
      if (!r.ok) console.warn('[LinkHelp] Supabase health check failed:', r.error);
    });
  }, []);
  return null;
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <ToastProvider>
            <DevSupabasePing />
            <CreditProvider>
              <AppDataProvider>
                <ServiceReviewProvider>
                  <BrowserRouter>
                    <AppModeProvider>
                      <AppRoutes />
                    </AppModeProvider>
                  </BrowserRouter>
                </ServiceReviewProvider>
              </AppDataProvider>
            </CreditProvider>
          </ToastProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
