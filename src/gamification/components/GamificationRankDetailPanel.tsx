import { useState } from 'react';
import { LhCardOverlay } from '@/components/design-system/LhCardOverlay';
import { useLanguage } from '@/context/LanguageContext';
import { GamificationTutorialModal } from '@/gamification/components/GamificationTutorialModal';
import {
  GamificationRankProgressBody,
  type GamificationRankProgressModel,
} from '@/gamification/components/GamificationRankPresentation';
import { getTutorialInitialCardIdForLevel } from '@/gamification/config/gamificationTutorialContent';
import type { UserType } from '@/gamification/types/gamification';

type Props = {
  open: boolean;
  onClose: () => void;
  userType: UserType;
  model: GamificationRankProgressModel;
};

export function GamificationRankDetailPanel({ open, onClose, userType, model }: Props) {
  const { t } = useLanguage();
  const [tutorialOpen, setTutorialOpen] = useState(false);

  const handleOpenTutorial = () => {
    setTutorialOpen(true);
  };

  const handleTutorialClose = () => {
    setTutorialOpen(false);
  };

  const handleTutorialBackFromFirst = () => {
    setTutorialOpen(false);
  };

  return (
    <>
      <LhCardOverlay
        open={open && !tutorialOpen}
        onClose={onClose}
        title={model.currentLevelLabel}
        subtitle={
          model.isMax
            ? t('gamification.max_level_reached')
            : t('gamification.next_prefix', { level: model.nextLevelLabel })
        }
        testId="gamification-rank-detail-panel"
        maxWidthClass="max-w-md"
      >
        <div className="flex items-start gap-3">
          <img
            src={model.medalSrc}
            alt=""
            className="lh-rank-compact-medal pointer-events-none h-16 w-16 shrink-0 object-contain motion-reduce:animate-none"
            loading="lazy"
            decoding="async"
          />
          <div className="min-w-0 flex-1 pt-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {userType === 'helper'
                ? t('gamification.helper_level_eyebrow')
                : t('gamification.client_level_eyebrow')}
            </p>
            <p className="text-lg font-black text-slate-950">{model.currentLevelLabel}</p>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">
              Score {model.record.score}
              <span className="text-slate-400"> / 1000</span>
            </p>
          </div>
        </div>

        <div className="mt-4">
          <GamificationRankProgressBody
            userType={userType}
            model={model}
            onOpenTutorial={handleOpenTutorial}
          />
        </div>
      </LhCardOverlay>

      <GamificationTutorialModal
        open={tutorialOpen}
        onClose={handleTutorialClose}
        userType={userType}
        initialCardId={getTutorialInitialCardIdForLevel(userType, model.record.levelKey)}
        onBackFromFirstStep={handleTutorialBackFromFirst}
      />
    </>
  );
}
