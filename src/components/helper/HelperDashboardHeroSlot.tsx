import { memo } from 'react';
import { DynamicHeroRenderer } from '@/gamification/components/DynamicHeroRenderer';
import type { UserGamificationRecord } from '@/gamification/services/gamificationService';
import { useDevRenderCount } from '@/utils/devRenderCount';

export type HelperDashboardHeroSlotProps = {
  gamification: UserGamificationRecord | null | undefined;
  gamificationLoading: boolean;
  gamificationError: boolean;
  avatarUrl: string | null | undefined;
  balance: number | null;
  completedServices: number;
  satisfactionRate: number;
  rating: number;
  connectedProfessionals: number;
};

function HelperDashboardHeroSlotInner(props: HelperDashboardHeroSlotProps) {
  useDevRenderCount('HelperDashboardHero');

  return <DynamicHeroRenderer userType="helper" {...props} />;
}

export const HelperDashboardHeroSlot = memo(HelperDashboardHeroSlotInner);
