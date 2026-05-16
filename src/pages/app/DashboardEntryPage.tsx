import { useEffect, useRef } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { PageLoader } from '@/components/common/PageLoader';
import { useAuth } from '@/context/AuthContext';
import { ROUTES } from '@/utils/constants';
import { authFlowLog } from '@/lib/authDebug';

/**
 * Session-only gate: sends users to /client or /helper after OAuth (or when landing without a deep link).
 * Lives outside `ProtectedRoute` so we can wait for `profiles` while already signed in.
 */
export default function DashboardEntryPage() {
  const navigate = useNavigate();
  const { session, profile, authBootstrapped, authLoading, refreshProfile, isConfigured } = useAuth();
  const attempts = useRef(0);
  const redirected = useRef(false);

  useEffect(() => {
    if (!isConfigured) return;
    if (!authBootstrapped) return;
    if (!session?.user) return;

    if (!profile && !authLoading && attempts.current < 5) {
      attempts.current += 1;
      void refreshProfile(session.user);
    }
  }, [isConfigured, authBootstrapped, session, profile, authLoading, refreshProfile]);

  useEffect(() => {
    if (!isConfigured || !authBootstrapped || !session?.user || !profile || redirected.current) return;
    redirected.current = true;
    const dest = profile.role === 'helper' ? ROUTES.helperHome : ROUTES.clientHome;
    authFlowLog('Redirecting to dashboard', { path: dest, role: profile.role });
    navigate(dest, { replace: true });
  }, [isConfigured, authBootstrapped, session, profile, navigate]);

  if (!isConfigured) {
    return <Navigate to={ROUTES.home} replace state={{ needSupabase: true }} />;
  }

  if (!authBootstrapped || (session?.user && !profile && authLoading)) {
    return <PageLoader />;
  }

  if (!session?.user) {
    return <Navigate to={ROUTES.login} replace />;
  }

  if (!profile) {
    if (attempts.current >= 5) {
      return (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-4 px-4 text-center">
          <p className="text-sm font-semibold text-slate-700">Could not load your profile.</p>
          <button
            type="button"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-black"
            onClick={() => {
              attempts.current = 0;
              void refreshProfile(session.user);
            }}
          >
            Try again
          </button>
        </div>
      );
    }
    return <PageLoader />;
  }

  return <PageLoader />;
}
