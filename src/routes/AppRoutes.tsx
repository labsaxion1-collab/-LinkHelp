import { lazy, type ComponentType } from 'react';
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
import { FluxHostGuard } from '@/components/auth/FluxHostGuard';
import { WwwHostGuard } from '@/components/auth/WwwHostGuard';
import { AppHostGuard } from '@/components/auth/AppHostGuard';
import { HostHomeEntry } from '@/components/routing/HostHomeEntry';
import { LegacyPaymentsRedirect } from '@/routes/LegacyPaymentsRedirect';
import { AppCatchAllRedirect } from '@/routes/AppCatchAllRedirect';
import ProfileDashboardPage from '@/pages/profile/ProfileDashboardPage';

function lazyPage<T extends { default: ComponentType<unknown> }>(loader: () => Promise<T>) {
  return lazy(() => importWithRetry(loader));
}

const HowItWorksPage = lazyPage(() => import('@/pages/public/HowItWorksPage'));
const ContactPage = lazyPage(() => import('@/pages/public/ContactPage'));
const LoginPage = lazyPage(() => import('@/pages/auth/LoginPage'));
const RegisterPage = lazyPage(() => import('@/pages/auth/RegisterPage'));
const ResetPasswordPage = lazyPage(() => import('@/pages/auth/ResetPasswordPage'));
const AuthCallbackPage = lazyPage(() => import('@/pages/auth/AuthCallbackPage'));
const AdminLoginPage = lazyPage(() => import('@/pages/auth/AdminLoginPage'));
const FluxAccessDeniedPage = lazyPage(() => import('@/pages/auth/FluxAccessDeniedPage'));
const DashboardEntryPage = lazyPage(() => import('@/pages/app/DashboardEntryPage'));
const ClientDashboard = lazyPage(() => import('@/pages/client/ClientDashboard'));
const ClientCreditsPage = lazyPage(() => import('@/pages/client/ClientCreditsPage'));
const ClientCreditsSuccessPage = lazyPage(() => import('@/pages/client/ClientCreditsSuccessPage'));
const HelperDashboard = lazyPage(() => import('@/pages/helper/HelperDashboard'));
const HelperUpcomingJobsPage = lazyPage(() => import('@/pages/helper/HelperUpcomingJobsPage'));
const MessagesPage = lazyPage(() => import('@/pages/chat/MessagesPage'));
const IdeasPage = lazyPage(() => import('@/pages/ideas/IdeasPage'));
const NotificationsPage = lazyPage(() => import('@/pages/notifications/NotificationsPage'));
const LiveMapPage = lazyPage(() => import('@/pages/map/LiveMapPage'));
const HelperCreditsPage = lazyPage(() => import('@/pages/helper/HelperCreditsPage'));
const HelperLinkCreditsPage = lazyPage(() => import('@/pages/helper/HelperLinkCreditsPage'));
const HelperCreditsSuccessPage = lazyPage(() => import('@/pages/helper/HelperCreditsSuccessPage'));
const SettingsPage = lazyPage(() => import('@/pages/settings/SettingsPage'));
const PublicProfileEditPage = lazyPage(() => import('@/pages/profile/PublicProfileEditPage'));

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

const PushTestPage = lazyPage(() => import('@/pages/admin/PushTestPage'));
const BackofficeUsersPage = lazyPage(() => import('@/pages/admin/backoffice/BackofficeUsersPage'));
const BackofficeUserDetailPage = lazyPage(() => import('@/pages/admin/backoffice/BackofficeUserDetailPage'));
const BackofficeRequestsPage = lazyPage(() => import('@/pages/admin/backoffice/BackofficeRequestsPage'));
const BackofficeRequestDetailPage = lazyPage(() => import('@/pages/admin/backoffice/BackofficeRequestDetailPage'));
const BackofficeCreditsPage = lazyPage(() => import('@/pages/admin/backoffice/BackofficeCreditsPage'));
const BackofficeEconomyPage = lazyPage(() => import('@/pages/admin/backoffice/BackofficeEconomyPage'));
const BackofficeAuditPage = lazyPage(() => import('@/pages/admin/backoffice/BackofficeAuditPage'));
const BackofficeSupportPage = lazyPage(() => import('@/pages/admin/backoffice/BackofficeSupportPage'));

const AdminDashboard = lazy(() =>
  importWithRetry(() => import('@/pages/admin/AdminDashboard')).catch((error: unknown) => {
    console.error('[LinkHelp] AdminDashboard chunk failed to load', error);
    return { default: AdminDashboardLoadError };
  }),
);

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route element={<FluxHostGuard />}>
        <Route element={<WwwHostGuard />}>
        <Route element={<AppHostGuard />}>
        <Route element={<PublicOnlyRoute />}>
          <Route path={ROUTES.home} element={<HostHomeEntry />} />

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
        <Route path={ROUTES.adminLogin} element={<AdminLoginPage />} />
        <Route path={ROUTES.fluxAccessDenied} element={<FluxAccessDeniedPage />} />
        <Route path={ROUTES.dashboard} element={<DashboardEntryPage />} />
        {/* Stripe return — outside ProtectedRoute so session recovery can run before login redirect */}
        <Route path={ROUTES.helperCreditsSuccess} element={<HelperCreditsSuccessPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path={ROUTES.messages} element={<MessagesPage />} />
          <Route path={ROUTES.notifications} element={<NotificationsPage />} />
          <Route path={ROUTES.profile} element={<ProfileDashboardPage />} />
          <Route path={ROUTES.profilePublicEdit} element={<PublicProfileEditPage />} />
          <Route path={ROUTES.settings} element={<SettingsPage />} />
          <Route path={ROUTES.map} element={<LiveMapPage />} />
          <Route
            path={ROUTES.helperCredits}
            element={UI_VISIBILITY.helperCredits ? <HelperCreditsPage /> : <Navigate to={ROUTES.dashboard} replace />}
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

          <Route element={<RoleRoute requiredRole="client" />}>
            <Route path="/client" element={<Navigate to={ROUTES.clientDashboard} replace />} />
            <Route path={ROUTES.clientDashboard} element={<ClientDashboard />} />
            <Route path={ROUTES.clientJobs} element={<ClientDashboard />} />
            <Route path={ROUTES.clientCredits} element={<ClientCreditsPage />} />
            <Route path={ROUTES.clientCreditsSuccess} element={<ClientCreditsSuccessPage />} />
            <Route
              path={ROUTES.ideas}
              element={UI_VISIBILITY.ideas ? <IdeasPage /> : <Navigate to={ROUTES.clientDashboard} replace />}
            />
            <Route
              path={ROUTES.payments}
              element={
                UI_VISIBILITY.clientCredits ? (
                  <LegacyPaymentsRedirect />
                ) : (
                  <Navigate to={ROUTES.clientDashboard} replace />
                )
              }
            />
          </Route>

          <Route element={<RoleRoute requiredRole="helper" />}>
            <Route path="/helper" element={<Navigate to={ROUTES.helperDashboard} replace />} />
            <Route path={ROUTES.helperDashboard} element={<HelperDashboard />} />
            <Route path={ROUTES.helperOpportunities} element={<HelperDashboard />} />
            <Route path={ROUTES.helperPerformance} element={<HelperDashboard />} />
            <Route path={ROUTES.helperJobs} element={<HelperUpcomingJobsPage />} />
            <Route path="/helper/jobs/upcoming" element={<Navigate to={ROUTES.helperJobs} replace />} />
          </Route>

          <Route element={<AdminProtectedRoute />}>
            <Route element={<FluxAdminLayout />}>
              <Route path={ROUTES.adminDashboard} element={<AdminDashboard />} />
              <Route path={ROUTES.adminUsers} element={<BackofficeUsersPage />} />
              <Route path={ROUTES.adminUserDetail} element={<BackofficeUserDetailPage />} />
              <Route path={ROUTES.adminRequests} element={<BackofficeRequestsPage />} />
              <Route path={ROUTES.adminRequestDetail} element={<BackofficeRequestDetailPage />} />
              <Route path={ROUTES.adminCredits} element={<BackofficeCreditsPage />} />
              <Route path={ROUTES.adminEconomy} element={<BackofficeEconomyPage />} />
              <Route path={ROUTES.adminAudit} element={<BackofficeAuditPage />} />
              <Route path={ROUTES.adminSupport} element={<BackofficeSupportPage />} />
              <Route path={ROUTES.adminPushTest} element={<PushTestPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<AppCatchAllRedirect />} />
        </Route>
        </Route>
        </Route>
      </Route>
    </Routes>
  );
}
