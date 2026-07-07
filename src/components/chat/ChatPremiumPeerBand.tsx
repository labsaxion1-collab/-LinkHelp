import type { ReactNode } from 'react';
import { clsx } from 'clsx';
import backgroundImage from '@/assets/hero/backgrounds/helper/bg-verde.png';

type Props = {
  children: ReactNode;
  className?: string;
};

export function ChatPremiumPeerBand({ children, className }: Props) {
  return (
    <div className={clsx('relative isolate w-full overflow-visible rounded-none bg-[#020804]', className)}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <img
          src={backgroundImage}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover opacity-95"
        />
        <div
          className="absolute inset-0 bg-[radial-gradient(circle_at_72%_50%,rgba(99,230,28,0.22),transparent_42%),linear-gradient(90deg,rgba(0,5,2,0.94)_0%,rgba(1,12,4,0.78)_55%,rgba(0,5,2,0.92)_100%)]"
          aria-hidden
        />
        <div className="lh-chat-peer-band-shine" aria-hidden />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
