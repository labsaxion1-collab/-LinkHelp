import { AvatarMapPin } from '@/components/map/AvatarMapPin';

type Props = {
  clientName: string;
  clientAvatar?: string | null;
  urgent?: boolean;
};

export function ClientJobMapPin({ clientName, clientAvatar, urgent = false }: Props) {
  return (
    <AvatarMapPin name={clientName} avatarUrl={clientAvatar} urgent={urgent} variant="client" />
  );
}
