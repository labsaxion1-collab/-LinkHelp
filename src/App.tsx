/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Route table and lazy-loaded pages live in `src/routes/AppRoutes.tsx`.
 */

import React, { useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { LanguageProvider } from '@/context/LanguageContext';
import { AppDataProvider } from '@/context/AppDataContext';
import { JobReminderBridge } from '@/components/notifications/JobReminderBridge';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { AppModeProvider } from '@/context/AppModeContext';
import { CreditProvider } from '@/context/CreditContext';
import { ServiceReviewProvider } from '@/context/ServiceReviewContext';
import { AppRoutes } from '@/routes/AppRoutes';
import { checkSupabaseConnection, isSupabaseConfigured } from '@/lib/supabase';
import { authDevLog } from '@/lib/authDebug';
import { IntroSplash } from '@/components/common/IntroSplash';

/** Returns true if the intro was already shown this session */
function introAlreadyPlayed(): boolean {
  try {
    return sessionStorage.getItem('lh:intro-played') === '1';
  } catch {
    return false;
  }
}

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
  const [showIntro, setShowIntro] = useState(() => !introAlreadyPlayed());

  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <ToastProvider>
            <DevSupabasePing />
            <CreditProvider>
              <AppDataProvider>
                <JobReminderBridge />
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

      {/* Intro splash — renderiza por cima, remove-se após o vídeo terminar */}
      {showIntro && (
        <IntroSplash onDone={() => setShowIntro(false)} />
      )}
    </ThemeProvider>
  );
}
