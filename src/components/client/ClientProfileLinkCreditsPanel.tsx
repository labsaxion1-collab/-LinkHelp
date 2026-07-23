/**
 * Legacy panel removed from Profile. Kept as a thin redirect so any stale
 * import never paints the old 4-tile wallet grid again.
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/utils/constants';

export function ClientProfileLinkCreditsPanel() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(ROUTES.profile, { replace: true });
  }, [navigate]);
  return null;
}
