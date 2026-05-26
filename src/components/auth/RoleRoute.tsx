import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { dashboardPathForRole } from '@/utils/userRole';
import type { ProfileRole } from '@/types/database';
import { PageLoader } from '@/components/common/PageLoader';

type Props = {
  requiredRole: ProfileRole;
};

/** Redirects to the correct dashboard when profile role does not match the route. */
export function RoleRoute({ requiredRole }: Props) {
  const { profile } = useAuth();
  if (!profile) return <PageLoader />;
  if (profile.role !== requiredRole) {
    return <Navigate to={dashboardPathForRole(profile.role)} replace />;
  }
  return <Outlet />;
}
