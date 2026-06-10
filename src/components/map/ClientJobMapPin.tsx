import { AvatarMapPin } from '@/components/map/AvatarMapPin';
import { getCategoryMapColors } from '@/utils/categoryFeedTheme';

type Props = {
  clientName: string;
  clientAvatar?: string | null;
  urgent?: boolean;
  highlighted?: boolean;
  /** Service category — used to color the marker ring. Optional; falls back to blue. */
  category?: string;
};

export function ClientJobMapPin({
  clientName,
  clientAvatar,
  urgent = false,
  highlighted = false,
  category,
}: Props) {
  const colors = category ? getCategoryMapColors(category) : null;

  return (
    <AvatarMapPin
      name={clientName}
      avatarUrl={clientAvatar}
      urgent={urgent}
      highlighted={highlighted}
      variant="client"
      borderColor={colors?.border}
      ringColor={colors?.ring}
    />
  );
}
