import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { useProfileForm } from '@/hooks/useProfileForm';
import { ProfileFormFields } from '@/components/profile/ProfileFormFields';
import { ROUTES } from '@/utils/constants';
import { initialsForName } from '@/utils/avatarUrl';

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

  if (!open) return null;

  const handleSave = async () => {
    const ok = await form.save();
    if (ok) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col transform transition-all animate-in zoom-in-95 duration-200 max-h-[min(92dvh,900px)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center shrink-0">
          <h3 className="text-xl font-bold text-gray-900">{t(titleKey)}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500"
            aria-label={t('common.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto overscroll-contain flex-1">
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
            <p className="mt-4 text-center text-xs text-gray-500">
              <Link to={`${ROUTES.settings}#avatar`} onClick={onClose} className="font-semibold text-blue-600 hover:underline">
                {t('profile_form.change_photo_in_settings')}
              </Link>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
