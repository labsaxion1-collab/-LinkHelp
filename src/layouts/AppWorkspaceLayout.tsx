import type { ReactNode } from 'react';
import { clsx } from 'clsx';

type Props = {
  /** Desktop left column (sidebar) — hidden on small screens; pass `null` to reserve no column */
  sidebar: ReactNode;
  /** Primary workspace content */
  children: ReactNode;
  /** Optional third column (e.g. radar, widgets) */
  rightPanel?: ReactNode;
  className?: string;
};

/**
 * Shared marketplace workspace grid: sidebar | main | optional right panel.
 * Mobile: stacks; md+: fixed sidebar width; lg+: right column.
 */
export function AppWorkspaceLayout({ sidebar, children, rightPanel, className }: Props) {
  const hasRight = Boolean(rightPanel);
  return (
    <div
      className={clsx(
        'max-w-[1600px] mx-auto grid grid-cols-1 gap-[var(--lh-gutter)] justify-center',
        'md:grid-cols-[minmax(0,280px)_minmax(0,1fr)]',
        hasRight && 'lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)_minmax(0,320px)]',
        className,
      )}
    >
      {sidebar}
      <div className="min-w-0">{children}</div>
      {hasRight ? <div className="min-w-0 hidden lg:block">{rightPanel}</div> : null}
    </div>
  );
}
