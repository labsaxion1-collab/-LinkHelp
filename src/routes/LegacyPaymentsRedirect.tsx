import { Navigate, useSearchParams } from 'react-router-dom';
import { ROUTES } from '@/utils/constants';

/** Legacy `/payments` → official client credits store; preserves old Stripe return query params. */
export function LegacyPaymentsRedirect() {
  const [searchParams] = useSearchParams();
  const checkout = searchParams.get('checkout');

  if (checkout === 'success') {
    return <Navigate to={ROUTES.clientCreditsSuccess} replace />;
  }

  if (checkout === 'cancelled') {
    return <Navigate to={`${ROUTES.clientCredits}?cancelled=true`} replace />;
  }

  return <Navigate to={ROUTES.clientCredits} replace />;
}
