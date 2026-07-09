import type { ReactNode } from 'react';
import { clsx } from 'clsx';
import greenBackgroundImage from '@/assets/hero/backgrounds/helper/bg-verde.png';
import blueBackgroundImage from '@/assets/hero/backgrounds/client/bg-roxo.png';
import goldBackgroundImage from '@/assets/hero/backgrounds/client/bg-dourado.png';
import purpleBackgroundImage from '@/assets/hero/backgrounds/client/bg-roxo.png';
import magentaBackgroundImage from '@/assets/hero/backgrounds/client/bg-magenta.png';
import eliteBackgroundImage from '@/assets/hero/backgrounds/client/bg-dourado-flare.png';
import { getChatHeroAccentTheme } from '@/components/chat/chatHeroTheme';

const BACKGROUND_BY_THEME = {
  green: greenBackgroundImage,
  blue: blueBackgroundImage,
  gold: goldBackgroundImage,
  purple: purpleBackgroundImage,
  magenta: magentaBackgroundImage,
  elite: eliteBackgroundImage,
} as const;

type Props = {
  children: ReactNode;
  className?: string;
  heroKey?: string | null;
};

export function ChatPremiumPeerBand({ children, className, heroKey }: Props) {
  const theme = getChatHeroAccentTheme(heroKey);
  const backgroundImage = BACKGROUND_BY_THEME[theme.backgroundKey];

  return (
    <div className={clsx('relative isolate w-full overflow-visible rounded-none', theme.bandBase, className)}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <img
          src={backgroundImage}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover opacity-95"
        />
        <div className={clsx('absolute inset-0', theme.bandOverlay)} aria-hidden />
        <div className="lh-chat-peer-band-shine" aria-hidden />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}