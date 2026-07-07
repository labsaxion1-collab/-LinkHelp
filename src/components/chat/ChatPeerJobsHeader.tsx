import { ChevronLeft } from 'lucide-react';
import { MEDAL_MAP } from '@/gamification/config/gamificationMedals';
import type { UserType } from '@/gamification/types/gamification';
import { ChatPremiumPeerBand } from '@/components/chat/ChatPremiumPeerBand';

type Props = {
  peerName: string;
  peerAvatar: string;
  heroKey?: string | null;
  peerUserType: UserType;
  onBack: () => void;
  backLabel: string;
  jobsCountLabel: string;
};

export function ChatPeerJobsHeader({
  peerName,
  peerAvatar,
  heroKey,
  peerUserType,
  onBack,
  backLabel,
  jobsCountLabel,
}: Props) {
  const shortName = peerName.split(' ')[0] || peerName;
  const resolvedHeroKey = heroKey ?? `${peerUserType}_novo`;
  const medalSrc = MEDAL_MAP[resolvedHeroKey] ?? MEDAL_MAP[`${peerUserType}_novo`];

  return (
    <ChatPremiumPeerBand className="shrink-0">
      <div className="flex items-center gap-2 px-3 pb-1 pt-1.5 md:px-3.5 md:pt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/75 transition-colors hover:bg-white/10 hover:text-white"
          aria-label={backLabel}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

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
            <p className="text-[11px] font-medium leading-tight text-lime-300/75">{jobsCountLabel}</p>
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
    </ChatPremiumPeerBand>
  );
}
