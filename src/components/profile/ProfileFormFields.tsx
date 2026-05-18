import { MapPin } from 'lucide-react';
import { CityRegionAutocomplete } from '@/components/common/CityRegionAutocomplete';
import { ProfilePhoneField } from '@/components/profile/ProfilePhoneField';
import type { useProfileForm } from '@/hooks/useProfileForm';
import type { ReactNode } from 'react';

type ProfileForm = ReturnType<typeof useProfileForm>;

type Props = ProfileForm & {
  t: (key: string) => string;
  avatarUrl: string;
  avatarInitials?: string;
  onChangePhoto?: () => void;
};

export function ProfileFormFields({
  t,
  authEmail,
  name,
  setName,
  phone,
  setPhone,
  cityDisplay,
  changeCityText,
  pickCity,
  locationLabel,
  bio,
  setBio,
  saving,
  save,
  phoneValidation,
  isConfigured,
  avatarUrl,
  avatarInitials,
  onChangePhoto,
}: Props) {
  return (
    <div className="flex flex-col sm:flex-row gap-8">
      <div className="w-full sm:w-1/3 space-y-4">
        <MotionProfileSidebar>
          <button
            type="button"
            onClick={onChangePhoto}
            disabled={!onChangePhoto}
            className="relative group mb-4 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-default mx-auto block"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg" />
            ) : (
              <span className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-slate-200 to-slate-300 text-2xl font-bold text-slate-700 shadow-lg">
                {avatarInitials ?? '?'}
              </span>
            )}
            {onChangePhoto ? (
              <span className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-bold px-2 text-center">
                {t('nav.profile_menu_change_photo')}
              </span>
            ) : null}
          </button>
          <h2 className="text-xl font-bold text-gray-900 text-center">{name || '—'}</h2>
          {locationLabel ? (
            <p className="text-gray-500 flex items-center gap-1 mt-1 justify-center text-sm">
              <MapPin className="w-4 h-4 shrink-0" /> {locationLabel}
            </p>
          ) : null}
        </MotionProfileSidebar>
      </div>

      <div className="w-full sm:w-2/3 space-y-5">
        <div>
          <label className="text-sm font-bold text-gray-700 block mb-2">{t('app_pages.settings_name')}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!isConfigured || saving}
            className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl p-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none disabled:opacity-60"
          />
        </div>

        <div>
          <label className="text-sm font-bold text-gray-700 block mb-2">{t('client_dashboard.about_me')}</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            disabled={!isConfigured || saving}
            rows={4}
            placeholder={t('client_dashboard.bio_placeholder')}
            className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl p-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none resize-none disabled:opacity-60"
          />
        </div>

        <ProfilePhoneField
          label={t('client_dashboard.phone_label')}
          value={phone}
          onChange={setPhone}
          disabled={!isConfigured || saving}
          t={t}
        />

        <MotionEmailField>
          <label className="text-sm font-bold text-gray-700 block mb-2">{t('client_dashboard.email_label')}</label>
          <input
            type="email"
            readOnly
            disabled
            value={authEmail}
            className="w-full bg-gray-100 border-2 border-gray-200 rounded-xl p-3 text-gray-600 cursor-not-allowed"
            placeholder={authEmail ? undefined : t('profile_form.email_empty')}
          />
          <p className="mt-1.5 text-xs text-gray-500">{t('profile_form.email_readonly_hint')}</p>
        </MotionEmailField>

        <CityRegionAutocomplete
          label={t('app_pages.settings_city')}
          value={cityDisplay}
          onChangeText={changeCityText}
          onPickPlace={pickCity}
          disabled={!isConfigured || saving}
          placeholder={t('profile_form.city_placeholder')}
        />

        <div className="pt-2 border-t border-gray-100">
          <button
            type="button"
            disabled={saving || Boolean(phone?.trim() && !phoneValidation.valid)}
            onClick={() => void save()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-sm w-full min-h-[48px]"
          >
            {saving ? t('profile_form.saving') : t('client_dashboard.save_changes')}
          </button>
        </div>
      </div>
    </div>
  );
}

function MotionProfileSidebar({ children }: { children: ReactNode }) {
  return <div className="flex flex-col items-center text-center">{children}</div>;
}

function MotionEmailField({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}
