import { lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { UI_VISIBILITY } from '@/config/uiVisibility';
import { ROUTES } from '@/utils/constants';
import Layout from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

const LandingPage = lazy(() => import('@/pages/LandingPage'));
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));
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
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage'));

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path={ROUTES.home} element={<LandingPage />} />

        <Route path="/login" element={<Navigate to={ROUTES.login} replace />} />
        <Route path="/signup" element={<Navigate to={ROUTES.signup} replace />} />
        <Route path={ROUTES.login} element={<LoginPage />} />
        <Route path={ROUTES.signup} element={<RegisterPage />} />
        <Route path={ROUTES.authCallback} element={<AuthCallbackPage />} />
        <Route path={ROUTES.dashboard} element={<DashboardEntryPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/client" element={<Navigate to={ROUTES.clientDashboard} replace />} />
          <Route path={ROUTES.clientDashboard} element={<ClientDashboard />} />
          <Route path={ROUTES.clientJobs} element={<ClientDashboard />} />

          <Route path="/helper" element={<Navigate to={ROUTES.helperDashboard} replace />} />
          <Route path={ROUTES.helperDashboard} element={<HelperDashboard />} />
          <Route path={ROUTES.helperOpportunities} element={<HelperDashboard />} />
          <Route path={ROUTES.helperJobs} element={<HelperUpcomingJobsPage />} />
          <Route path="/helper/jobs/upcoming" element={<Navigate to={ROUTES.helperJobs} replace />} />
          <Route path={ROUTES.helperTraining} element={<HelperTrainingPage />} />

          <Route path={ROUTES.messages} element={<MessagesPage />} />
          <Route
            path={ROUTES.ideas}
            element={UI_VISIBILITY.ideas ? <IdeasPage /> : <Navigate to={ROUTES.clientDashboard} replace />}
          />
          <Route path={ROUTES.notifications} element={<NotificationsPage />} />
          <Route path={ROUTES.map} element={<LiveMapPage />} />
          <Route
            path={ROUTES.payments}
            element={UI_VISIBILITY.clientCredits ? <PaymentsPage /> : <Navigate to={ROUTES.clientDashboard} replace />}
          />
          <Route path={ROUTES.settings} element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
      </Route>
    </Routes>
  );
}
