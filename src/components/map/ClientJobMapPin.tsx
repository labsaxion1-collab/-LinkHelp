import { AvatarMapPin } from '@/components/map/AvatarMapPin';

type Props = {
  clientName: string;
  clientAvatar?: string | null;
  urgent?: boolean;
  highlighted?: boolean;
};

export function ClientJobMapPin({ clientName, clientAvatar, urgent = false, highlighted = false }: Props) {
  return (
    <AvatarMapPin
      name={clientName}
      avatarUrl={clientAvatar}
      urgent={urgent}
      highlighted={highlighted}
      variant="client"
    />
  );
}
