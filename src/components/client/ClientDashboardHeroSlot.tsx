import { memo } from 'react';
import { DynamicHeroRenderer } from '@/gamification/components/DynamicHeroRenderer';
import type { UserGamificationRecord } from '@/gamification/services/gamificationService';
import { useDevRenderCount } from '@/utils/devRenderCount';

export type ClientDashboardHeroSlotProps = {
  gamification: UserGamificationRecord | null | undefined;
  gamificationLoading: boolean;
  gamificationError: boolean;
  avatarUrl: string | null | undefined;
  balance: number | null;
};

function ClientDashboardHeroSlotInner({
  gamification,
  gamificationLoading,
  gamificationError,
  avatarUrl,
  balance,
}: ClientDashboardHeroSlotProps) {
  useDevRenderCount('ClientDashboardHero');

  return (
    <DynamicHeroRenderer
      userType="client"
      gamification={gamification}
      gamificationLoading={gamificationLoading}
      gamificationError={gamificationError}
      avatarUrl={avatarUrl}
      balance={balance}
      completedServices={0}
      satisfactionRate={0}
      rating={0}
      connectedProfessionals={0}
    />
  );
}

export const ClientDashboardHeroSlot = memo(ClientDashboardHeroSlotInner);
