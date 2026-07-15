/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Route table and lazy-loaded pages live in `src/routes/AppRoutes.tsx`.
 */

import React, { useEffect, useState } from 'react';
import { IntroSplash } from '@/components/common/IntroSplash';

function introAlreadyPlayed(): boolean {
  try { return sessionStorage.getItem('lh:intro-played') === '1'; } catch { return false; }
}
import { BrowserRouter } from 'react-router-dom';
import { LanguageProvider } from '@/context/LanguageContext';
import { AppDataProvider } from '@/context/AppDataContext';
import { JobReminderBridge } from '@/components/notifications/JobReminderBridge';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { AppModeProvider, AppModeRouterBridge } from '@/context/AppModeContext';
import { CreditProvider } from '@/context/CreditContext';
import { ServiceReviewProvider } from '@/context/ServiceReviewContext';
import { AppRoutes } from '@/routes/AppRoutes';
import { TutorialProvider } from '@/context/TutorialContext';
import { AppTutorialModal } from '@/components/tutorial/AppTutorialModal';
import { MedalThemeBridge } from '@/theme/MedalThemeBridge';
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
  const [showIntro, setShowIntro] = useState(() => !introAlreadyPlayed());

  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <MedalThemeBridge />
          <ToastProvider>
            <DevSupabasePing />
            <CreditProvider>
              <AppDataProvider>
                <JobReminderBridge />
                <AppModeProvider>
                  <BrowserRouter>
                    <ServiceReviewProvider>
                      <AppModeRouterBridge />
                      <TutorialProvider>
                        <AppRoutes />
                        <AppTutorialModal />
                      </TutorialProvider>
                    </ServiceReviewProvider>
                  </BrowserRouter>
                </AppModeProvider>
              </AppDataProvider>
            </CreditProvider>
          </ToastProvider>
        </AuthProvider>
      </LanguageProvider>
      {showIntro && <IntroSplash onDone={() => setShowIntro(false)} />}
    </ThemeProvider>
  );
}
