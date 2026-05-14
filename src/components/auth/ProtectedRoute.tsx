import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { PageLoader } from '@/components/common/PageLoader';
import { useAuth } from '@/context/AuthContext';
import { ROUTES } from '@/utils/constants';

/** Require Supabase env, real session, and a `profiles` row for workspace routes. */
export function ProtectedRoute() {
  const { session, profile, authLoading, authBootstrapped, isConfigured, refreshProfile } = useAuth();
  const location = useLocation();

  if (!isConfigured) {
    return <Navigate to={ROUTES.home} replace state={{ needSupabase: true }} />;
  }

  if (!authBootstrapped || authLoading) {
    return <PageLoader />;
  }

  if (!session) {
    return <Navigate to={ROUTES.login} replace state={{ from: location.pathname }} />;
  }

  if (!profile) {
    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-sm font-semibold text-slate-700">Não foi possível carregar o seu perfil.</p>
        <button
          type="button"
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-black"
          onClick={() => void refreshProfile()}
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return <Outlet />;
}
