import { memo } from 'react';
import { GamificationCompactRankCard } from '@/gamification/components/GamificationCompactRankCard';
import type { UserGamificationRecord } from '@/gamification/services/gamificationService';
import { useDevRenderCount } from '@/utils/devRenderCount';

export type ClientDashboardHeroSlotProps = {
  gamification: UserGamificationRecord | null | undefined;
  gamificationLoading: boolean;
  gamificationError: boolean;
  avatarUrl: string | null | undefined;
  balance: number | null;
};

/**
 * Client Home ranking strip — compact premium card (240–300px), not the full Remotion hero.
 * Profile → Meu nível and frozen heroes remain untouched elsewhere.
 */
function ClientDashboardHeroSlotInner(_props: ClientDashboardHeroSlotProps) {
  useDevRenderCount('ClientDashboardHero');

  return (
    <GamificationCompactRankCard userType="client" density="clientHome" />
  );
}
export const ClientDashboardHeroSlot = memo(ClientDashboardHeroSlotInner);
