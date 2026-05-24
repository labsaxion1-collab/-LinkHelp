import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { PageLoader } from '@/components/common/PageLoader';
import { OAuthRolePicker } from '@/components/auth/OAuthRolePicker';
import { useAuth } from '@/context/AuthContext';
import { ROUTES } from '@/utils/constants';
import { authFlowLog } from '@/lib/authDebug';
import { getSupabase } from '@/lib/supabase';
import { userNeedsOAuthRoleSelection } from '@/utils/parseOAuthCallbackError';
import { confirmInitialProfileRole } from '@/services/supabase/profileRoleRemote';
import { dashboardPathForRole } from '@/utils/userRole';

/**
 * Post-OAuth gate: create/load profile, ask Client vs Helper once, then redirect.
 */
export default function DashboardEntryPage() {
  const navigate = useNavigate();
  const { session, profile, authBootstrapped, authLoading, refreshProfile, isConfigured } = useAuth();
  const attempts = useRef(0);
  const redirected = useRef(false);
  const [roleBusy, setRoleBusy] = useState(false);

  const needsRole = Boolean(session?.user && userNeedsOAuthRoleSelection(session.user));

  useEffect(() => {
    if (!isConfigured) return;
    if (!authBootstrapped) return;
    if (!session?.user) return;
    if (needsRole) return;

    if (!profile && !authLoading && attempts.current < 5) {
      attempts.current += 1;
      void refreshProfile(session.user);
    }
  }, [isConfigured, authBootstrapped, session, profile, authLoading, refreshProfile, needsRole]);

  useEffect(() => {
    if (!isConfigured || !authBootstrapped || !session?.user || !profile || redirected.current || needsRole) return;
    redirected.current = true;
    const dest = dashboardPathForRole(profile.role);
    authFlowLog('Redirecting to dashboard', { path: dest, role: profile.role });
    navigate(dest, { replace: true });
  }, [isConfigured, authBootstrapped, session, profile, navigate, needsRole]);

  const handleRoleConfirm = async (role: 'client' | 'helper') => {
    if (!session?.user) return;
    setRoleBusy(true);
    const now = new Date().toISOString();
    try {
      const sb = getSupabase();
      if (sb) {
        await sb.auth.updateUser({
          data: {
            user_type: role,
            accepted_terms: true,
            accepted_terms_at: now,
            helper_terms_accepted: role === 'helper',
            helper_terms_accepted_at: role === 'helper' ? now : '',
          },
        });
      }

      const result = await confirmInitialProfileRole(role);
      if (!result.ok) {
        console.warn('[LinkHelp] confirmInitialProfileRole', result.message);
      }

      await refreshProfile(session.user);
      redirected.current = true;
      navigate(dashboardPathForRole(role), { replace: true });
    } finally {
      setRoleBusy(false);
    }
  };

  if (!isConfigured) {
    return <Navigate to={ROUTES.home} replace state={{ needSupabase: true }} />;
  }

  if (!authBootstrapped) {
    return <PageLoader />;
  }

  if (!session?.user) {
    return <Navigate to={ROUTES.login} replace />;
  }

  if (needsRole) {
    return <OAuthRolePicker busy={roleBusy} onConfirm={handleRoleConfirm} />;
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
