/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Route table and lazy-loaded pages live in `src/routes/AppRoutes.tsx`.
 */

import React, { useEffect, useState } from 'react';
import { IntroSplash } from '@/components/common/IntroSplash';
import { readAppIntroVideoContext, shouldShowAppIntroVideo } from '@/utils/appIntroVideo';
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
import { DashboardPreloadEffect } from '@/components/routing/DashboardPreloadEffect';
import { HomeDashboardShellProvider } from '@/components/home/HomeDashboardShellContext';
import { TutorialProvider } from '@/context/TutorialContext';
import { AppTutorialModal } from '@/components/tutorial/AppTutorialModal';
import { MedalThemeBridge } from '@/theme/MedalThemeBridge';
import { PerfDebugPanel } from '@/components/dev/PerfDebugPanel';
import { checkSupabaseConnection, isSupabaseConfigured } from '@/lib/supabase';
import { authDevLog } from '@/lib/authDebug';
import { diagnoseSnapshotRead } from '@/utils/accountSessionSnapshot';
import { appPerfMark } from '@/utils/appPerf';

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
  const [showIntro, setShowIntro] = useState(() =>
    shouldShowAppIntroVideo(readAppIntroVideoContext()),
  );

  useEffect(() => {
    const diag = diagnoseSnapshotRead();
    if (diag.reason === 'accepted') {
      appPerfMark('cached-home-visible');
      document.documentElement.dataset.lhSnapshot = '1';
    }
    try {
      if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
      window.scrollTo(0, 0);
    } catch {
      /* ignore */
    }
  }, []);

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
                    <HomeDashboardShellProvider>
                    <ServiceReviewProvider>
                      <AppModeRouterBridge />
                      <DashboardPreloadEffect />
                      <TutorialProvider>
                        <AppRoutes />
                        <AppTutorialModal />
                      </TutorialProvider>
                    </ServiceReviewProvider>
                    <PerfDebugPanel />
                    </HomeDashboardShellProvider>
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
