import * as Icons from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LhModal } from '@/components/design-system/LhModal';
import { premium } from '@/components/design-system/premiumClasses';
import { ROUTES } from '@/utils/constants';
import { formatLinkCredits } from '@/utils/formatLinkCredits';

type Props = {
  open: boolean;
  requiredLc: number;
  onClose: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  language: string;
};

export function HelperInsufficientCreditsModal({ open, requiredLc, onClose, t, language }: Props) {
  const navigate = useNavigate();

  if (!open) return null;

  return (
    <LhModal
      open={open}
      onClose={onClose}
      title={t('helper_credits.insufficient_title')}
      size="sm"
      className="max-w-sm"
      footer={
        <div className="flex w-full flex-col gap-2 sm:flex-row">
          <button type="button" onClick={onClose} className={`${premium.btnSecondary} flex-1`}>
            {t('helper_credits.insufficient_back')}
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate(ROUTES.helperCredits);
            }}
            className={`${premium.btnPrimary} flex-1`}
          >
            <Icons.Coins className="h-4 w-4" />
            {t('helper_credits.insufficient_buy')}
          </button>
        </div>
      }
    >
      <p className="text-sm font-medium lh-text-muted">
        {t('helper_credits.insufficient_body', { amount: formatLinkCredits(requiredLc, language) })}
      </p>
    </LhModal>
  );
}
