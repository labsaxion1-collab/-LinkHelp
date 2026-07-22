import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { hrefForMarketplaceRoute, isExternalAbsoluteHref } from '@/utils/marketingNav';

type Props = {
  to: string;
  className?: string;
  children: ReactNode;
};

/** Institutional shell link — app routes on www go to app.linkhelp.app. */
export function MarketingNavLink({ to, className, children }: Props) {
  const href = hrefForMarketplaceRoute(to);
  if (isExternalAbsoluteHref(href)) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link to={href} className={className}>
      {children}
    </Link>
  );
}
