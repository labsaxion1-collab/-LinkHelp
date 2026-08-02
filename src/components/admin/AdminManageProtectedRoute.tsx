import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { PageLoader } from '@/components/common/PageLoader';
import { fetchAdminMe, canManageAdmins } from '@/admin/administrators/adminMeClient';
import { ROUTES } from '@/utils/constants';

/** Requires JWT admin + active DB role with `admins.manage` (super_admin). */
export function AdminManageProtectedRoute() {
  const { session, authLoading, authBootstrapped } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    const token = session?.access_token;
    if (!token) {
      setAllowed(false);
      return;
    }
    let cancelled = false;
    setAllowed(null);
    void fetchAdminMe(token)
      .then((me) => {
        if (!cancelled) setAllowed(canManageAdmins(me.permissions));
      })
      .catch(() => {
        if (!cancelled) setAllowed(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session?.access_token]);

  if (!authBootstrapped || authLoading || allowed === null) {
    return <PageLoader />;
  }

  if (!session || !allowed) {
    return <Navigate to={ROUTES.fluxAccessDenied} replace />;
  }

  return <Outlet />;
}
