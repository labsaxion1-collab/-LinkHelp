import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { PageLoader } from '@/components/common/PageLoader';

type Props = {
  targetUrl: string;
};

/** Full-page navigation to another LinkHelp origin (www ↔ app ↔ flux). */
export function ExternalOriginRedirect({ targetUrl }: Props) {
  const location = useLocation();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = targetUrl.includes('://')
      ? targetUrl
      : `${window.location.origin}${targetUrl}`;
    window.location.replace(url);
  }, [targetUrl, location.key]);

  return <PageLoader />;
}
