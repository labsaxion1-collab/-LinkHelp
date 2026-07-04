import { PremiumResponsiveModal } from '@/components/design-system/PremiumResponsiveModal';
import type { UserType } from '@/gamification/types/gamification';
import { GAMIFICATION_TUTORIAL_TITLE } from '@/gamification/config/gamificationTutorialContent';
import { GamificationTutorial } from '@/gamification/components/GamificationTutorial';

type Props = {
  open: boolean;
  onClose: () => void;
  userType: UserType;
};

/** Modal do tutorial de gamificação (bottom-sheet no mobile, modal no desktop). */
export function GamificationTutorialModal({ open, onClose, userType }: Props) {
  return (
    <PremiumResponsiveModal open={open} onClose={onClose} title={GAMIFICATION_TUTORIAL_TITLE}>
      <GamificationTutorial userType={userType} />
    </PremiumResponsiveModal>
  );
}
