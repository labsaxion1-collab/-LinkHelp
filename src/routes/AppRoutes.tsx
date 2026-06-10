import { lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { UI_VISIBILITY } from '@/config/uiVisibility';
import { ROUTES } from '@/utils/constants';
import { importWithRetry } from '@/utils/lazyWithRetry';
import Layout from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PublicOnlyRoute } from '@/components/auth/PublicOnlyRoute';
import { RoleRoute } from '@/components/auth/RoleRoute';
import { AdminProtectedRoute } from '@/components/admin/AdminProtectedRoute';
import { FluxAdminLayout } from '@/components/admin/FluxAdminLayout';
import { LoginSplashGate } from '@/components/auth/LoginSplashGate';

const LandingPage = lazy(() => import('@/pages/LandingPage'));
const HowItWorksPage = lazy(() => import('@/pages/public/HowItWorksPage'));
const ContactPage = lazy(() => import('@/pages/public/ContactPage'));
const LoginPage = lazy(() => importWithRetry(() => import('@/pages/auth/LoginPage')));
const RegisterPage = lazy(() => importWithRetry(() => import('@/pages/auth/RegisterPage')));
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage'));
const AuthCallbackPage = lazy(() => import('@/pages/auth/AuthCallbackPage'));
const DashboardEntryPage = lazy(() => import('@/pages/app/DashboardEntryPage'));
const ClientDashboard = lazy(() => import('@/pages/client/ClientDashboard'));
const HelperDashboard = lazy(() => import('@/pages/helper/HelperDashboard'));
const HelperUpcomingJobsPage = lazy(() => import('@/pages/helper/HelperUpcomingJobsPage'));
const HelperTrainingPage = lazy(() => import('@/pages/helper/HelperTrainingPage'));
const MessagesPage = lazy(() => import('@/pages/chat/MessagesPage'));
const IdeasPage = lazy(() => import('@/pages/ideas/IdeasPage'));
const NotificationsPage = lazy(() => import('@/pages/notifications/NotificationsPage'));
const LiveMapPage = lazy(() => import('@/pages/map/LiveMapPage'));
const PaymentsPage = lazy(() => import('@/pages/payments/PaymentsPage'));
const HelperCreditsPage = lazy(() => import('@/pages/helper/HelperCreditsPage'));
const HelperLinkCreditsPage = lazy(() => import('@/pages/helper/HelperLinkCreditsPage'));
const HelperCreditsSuccessPage = lazy(() => import('@/pages/helper/HelperCreditsSuccessPage'));
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage'));
const ProfilePage = lazy(() => import('@/pages/profile/ProfilePage'));

function AdminDashboardLoadError() {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
      <p className="text-sm font-bold text-white">FLUX Admin unavailable</p>
      <p className="mt-2 text-xs text-slate-500">
        The admin dashboard module failed to load. Refresh the page or try again later.
      </p>
    </div>
  );
}

const PushTestPage = lazy(() => import('@/pages/admin/PushTestPage'));

const AdminDashboard = lazy(async () => {
  try {
    return await import('@/pages/admin/AdminDashboard');
  } catch (error: unknown) {
    console.error('[LinkHelp] AdminDashboard chunk failed to load', error);
    return { default: AdminDashboardLoadError };
  }
});

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route element={<PublicOnlyRoute />}>
          <Route path={ROUTES.home} element={<LandingPage />} />

          <Route path="/login" element={<Navigate to={ROUTES.login} replace />} />
          <Route path="/signup" element={<Navigate to={ROUTES.signup} replace />} />
          <Route
            path={ROUTES.login}
            element={
              <LoginSplashGate>
                <LoginPage />
              </LoginSplashGate>
            }
          />
          <Route path={ROUTES.signup} element={<RegisterPage />} />
        </Route>
        <Route path={ROUTES.howItWorks} element={<HowItWorksPage />} />
        <Route path={ROUTES.contact} element={<ContactPage />} />
        <Route path={ROUTES.resetPassword} element={<ResetPasswordPage />} />
        <Route path={ROUTES.authCallback} element={<AuthCallbackPage />} />
        <Route path={ROUTES.dashboard} element={<DashboardEntryPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path={ROUTES.messages} element={<MessagesPage />} />
          <Route path={ROUTES.notifications} element={<NotificationsPage />} />
          <Route path={ROUTES.profile} element={<ProfilePage />} />
          <Route path={ROUTES.settings} element={<SettingsPage />} />
          <Route path={ROUTES.map} element={<LiveMapPage />} />

          <Route element={<RoleRoute requiredRole="client" />}>
            <Route path="/client" element={<Navigate to={ROUTES.clientDashboard} replace />} />
            <Route path={ROUTES.clientDashboard} element={<ClientDashboard />} />
            <Route path={ROUTES.clientJobs} element={<ClientDashboard />} />
            <Route
              path={ROUTES.ideas}
              element={UI_VISIBILITY.ideas ? <IdeasPage /> : <Navigate to={ROUTES.clientDashboard} replace />}
            />
            <Route
              path={ROUTES.payments}
              element={UI_VISIBILITY.clientCredits ? <PaymentsPage /> : <Navigate to={ROUTES.clientDashboard} replace />}
            />
          </Route>

          <Route element={<RoleRoute requiredRole="helper" />}>
            <Route path="/helper" element={<Navigate to={ROUTES.helperDashboard} replace />} />
            <Route path={ROUTES.helperDashboard} element={<HelperDashboard />} />
            <Route path={ROUTES.helperOpportunities} element={<HelperDashboard />} />
            <Route path={ROUTES.helperPerformance} element={<HelperDashboard />} />
            <Route path={ROUTES.helperJobs} element={<HelperUpcomingJobsPage />} />
            <Route path="/helper/jobs/upcoming" element={<Navigate to={ROUTES.helperJobs} replace />} />
            <Route
              path={ROUTES.helperTraining}
              element={
                UI_VISIBILITY.training ? (
                  <HelperTrainingPage />
                ) : (
                  <Navigate to={ROUTES.helperDashboard} replace />
                )
              }
            />
            <Route
              path={ROUTES.helperCredits}
              element={UI_VISIBILITY.helperCredits ? <HelperCreditsPage /> : <Navigate to={ROUTES.helperDashboard} replace />}
            />
            <Route
              path={ROUTES.helperLinkCredits}
              element={
                UI_VISIBILITY.helperCreditPurchase ? (
                  <HelperLinkCreditsPage />
                ) : (
                  <Navigate to={ROUTES.helperCredits} replace />
                )
              }
            />
            <Route path={ROUTES.helperCreditsSuccess} element={<HelperCreditsSuccessPage />} />
          </Route>

          <Route element={<AdminProtectedRoute />}>
            <Route element={<FluxAdminLayout />}>
              <Route path={ROUTES.adminDashboard} element={<AdminDashboard />} />
              <Route path={ROUTES.adminPushTest} element={<PushTestPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
      </Route>
    </Routes>
  );
}
