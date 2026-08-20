import { useMemo, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useGamification } from '@/gamification/hooks/useGamification';
import type { UserType } from '@/gamification/types/gamification';
import {
  buildGamificationRankProgressModel,
  GamificationCompactRankCardSurface,
  GamificationRankLoadingCard,
  GamificationRankUnavailableCard,
} from '@/gamification/components/GamificationRankPresentation';
import { GamificationRankDetailPanel } from '@/gamification/components/GamificationRankDetailPanel';

type Props = {
  userType: UserType;
  className?: string;
};

/** Compact clickable rank summary for dashboard feeds (reuses gamification hooks/calculations). */
export function GamificationCompactRankCard({ userType, className }: Props) {
  const { t } = useLanguage();
  const { record, loading, error } = useGamification(userType);
  const [detailOpen, setDetailOpen] = useState(false);

  const model = useMemo(
    () => buildGamificationRankProgressModel(userType, record, t),
    [userType, record, t],
  );

  if (loading && !record) {
    return <GamificationRankLoadingCard className={className} />;
  }

  if (!loading && (error || !model)) {
    return <GamificationRankUnavailableCard className={className} />;
  }

  return (
    <>
      <GamificationCompactRankCardSurface
        userType={userType}
        model={model!}
        onOpenDetails={() => setDetailOpen(true)}
        className={className}
      />
      <GamificationRankDetailPanel
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        userType={userType}
        model={model!}
      />
    </>
  );
}
