import { ChevronLeft } from 'lucide-react';
import { MEDAL_MAP } from '@/gamification/config/gamificationMedals';
import type { UserType } from '@/gamification/types/gamification';
import { ChatPremiumPeerBand } from '@/components/chat/ChatPremiumPeerBand';
import { ChatThreadServiceChip } from '@/components/chat/ChatThreadContext';

type ServiceProps = {
  title: string;
  dateLabel: string;
  location?: string;
  budgetLabel?: string;
  viewDetailsLabel: string;
  disabled?: boolean;
  onViewDetails: () => void;
};

type Props = {
  peerName: string;
  peerAvatar: string;
  heroKey?: string | null;
  peerUserType: UserType;
  statusLabel: string;
  showBack?: boolean;
  onBack?: () => void;
  backLabel?: string;
  service?: ServiceProps;
};

export function ChatThreadHeader({
  peerName,
  peerAvatar,
  heroKey,
  peerUserType,
  statusLabel,
  showBack = false,
  onBack,
  backLabel,
  service,
}: Props) {
  const shortName = peerName.split(' ')[0] || peerName;
  const resolvedHeroKey = heroKey ?? `${peerUserType}_novo`;
  const medalSrc = MEDAL_MAP[resolvedHeroKey] ?? MEDAL_MAP[`${peerUserType}_novo`];

  return (
    <ChatPremiumPeerBand className="relative z-30 shrink-0">
      <div className="flex items-center gap-2 px-3 pb-0.5 pt-1.5 sm:px-4 sm:pt-2">
        {showBack && onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/75 transition-colors hover:bg-white/10 hover:text-white"
            aria-label={backLabel}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        ) : null}

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <img
            src={peerAvatar}
            alt=""
            className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-white/25"
            loading="lazy"
            decoding="async"
          />
          <div className="min-w-0">
            <h2 className="truncate text-[15px] font-bold leading-tight tracking-tight text-white">{shortName}</h2>
            <p className="text-[11px] font-medium leading-tight text-lime-300/75">{statusLabel}</p>
          </div>
        </div>

        <img
          src={medalSrc}
          alt=""
          className="lh-chat-peer-medal h-[5.5rem] w-[5.5rem] shrink-0 object-contain"
          loading="lazy"
          decoding="async"
        />
      </div>

      {service ? (
        <div className="relative -mt-1.5 px-3 pb-2 pt-0 sm:px-4">
          <ChatThreadServiceChip {...service} />
        </div>
      ) : null}
    </ChatPremiumPeerBand>
  );
}
