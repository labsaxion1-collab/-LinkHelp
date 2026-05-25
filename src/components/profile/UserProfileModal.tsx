import { Link } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { useProfileForm } from '@/hooks/useProfileForm';
import { ProfileFormFields } from '@/components/profile/ProfileFormFields';
import { LhModal } from '@/components/design-system/LhModal';
import { ROUTES } from '@/utils/constants';
import { initialsForName } from '@/utils/avatarUrl';
import type { ReactNode } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  avatarUrl: string;
  titleKey?: string;
  onChangePhoto?: () => void;
  footer?: ReactNode;
};

export function UserProfileModal({
  open,
  onClose,
  avatarUrl,
  titleKey = 'client_dashboard.profile_modal_title',
  onChangePhoto,
  footer,
}: Props) {
  const { t } = useLanguage();
  const form = useProfileForm();

  const handleSave = async (): Promise<boolean> => {
    const ok = await form.save();
    if (ok) onClose();
    return ok;
  };

  return (
    <LhModal open={open} onClose={onClose} title={t(titleKey)} size="lg" className="max-w-3xl">
      <ProfileFormFields
        {...form}
        t={t}
        avatarUrl={avatarUrl}
        avatarInitials={initialsForName(form.name || '?')}
        save={handleSave}
        onChangePhoto={onChangePhoto}
      />
      {footer}
      {!onChangePhoto ? (
        <p className="mt-4 text-center text-xs lh-text-muted">
          <Link to={`${ROUTES.settings}#avatar`} onClick={onClose} className="font-semibold text-[#33B6FF] hover:underline">
            {t('profile_form.change_photo_in_settings')}
          </Link>
        </p>
      ) : null}
    </LhModal>
  );
}
