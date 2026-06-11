import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { PageLoader } from '@/components/common/PageLoader';
import { OAuthRolePicker } from '@/components/auth/OAuthRolePicker';
import { useAuth } from '@/context/AuthContext';
import { ROUTES } from '@/utils/constants';
import { authFlowLog, roleFromAuthMetadata, roleRoutingLog } from '@/lib/authDebug';
import { getSupabase } from '@/lib/supabase';
import { userNeedsRoleSelection, profileIsDeleted } from '@/utils/parseOAuthCallbackError';
import { confirmInitialProfileRole } from '@/services/supabase/profileRoleRemote';
import { dashboardPathForRole, normalizeProfileRole } from '@/utils/userRole';
import { writeStoredAppMode } from '@/utils/appModeStorage';

/**
 * Post-OAuth gate: create/load profile, ask Client vs Helper once, then redirect.
 */
export default function DashboardEntryPage() {
  const navigate = useNavigate();
  const { session, profile, authBootstrapped, authLoading, refreshProfile, isConfigured, signOut } = useAuth();
  const attempts = useRef(0);
  const redirected = useRef(false);
  const [roleBusy, setRoleBusy] = useState(false);

  const needsRole = Boolean(session?.user && userNeedsRoleSelection(session.user, profile));

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
    const role = normalizeProfileRole(profile.role);
    writeStoredAppMode(role, session.user.id);
    const dest = dashboardPathForRole(role);
    roleRoutingLog('DashboardEntry:redirect', {
      userId: session.user.id,
      email: session.user.email ?? profile.email ?? null,
      role_from_profile: profile.role,
      role_from_auth: roleFromAuthMetadata(session.user),
      redirect_destination: dest,
    });
    authFlowLog('Redirecting to dashboard', { path: dest, role, profileRole: profile.role });
    navigate(dest, { replace: true });
  }, [isConfigured, authBootstrapped, session, profile, navigate, needsRole]);

  const handleRoleConfirm = async (role: 'client' | 'helper') => {
    if (!session?.user) return;
    setRoleBusy(true);
    const now = new Date().toISOString();
    try {
      authFlowLog('OAuth role picker confirmed', { role, userId: session.user.id });

      // First attempt to set role in DB
      const result = await confirmInitialProfileRole(role);
      if (result.ok === false) {
        authFlowLog('confirmInitialProfileRole first attempt failed — retrying', { role, message: result.message });
        console.warn('[LinkHelp] confirmInitialProfileRole first attempt:', result.message);
        // Profile may not exist yet (trigger race). Wait briefly then retry.
        await new Promise((r) => window.setTimeout(r, 1500));
        const retry = await confirmInitialProfileRole(role);
        if (retry.ok === false) {
          console.warn('[LinkHelp] confirmInitialProfileRole retry failed:', retry.message);
          // Continue anyway — updateUser metadata is the fallback path
        }
      }

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

        // Get fresh user AFTER updateUser so that refreshProfile sees user_type: role
        const { data: freshSession } = await sb.auth.getUser();
        const freshUser = freshSession?.user ?? session.user;
        await refreshProfile(freshUser);
      } else {
        await refreshProfile(session.user);
      }

      writeStoredAppMode(role, session.user.id);
      redirected.current = true;
      const dest = dashboardPathForRole(role);
      authFlowLog('OAuth role confirmed — navigating', { role, dest });
      navigate(dest, { replace: true });
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

  const handleRoleReject = async () => {
    authFlowLog('OAuth role picker rejected terms', { userId: session?.user?.id });
    await signOut();
    navigate(ROUTES.signup, { replace: true });
  };

  if (needsRole) {
    return (
      <OAuthRolePicker
        busy={roleBusy}
        accountPreviouslyRegistered={profileIsDeleted(profile)}
        onConfirm={handleRoleConfirm}
        onReject={handleRoleReject}
      />
    );
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
