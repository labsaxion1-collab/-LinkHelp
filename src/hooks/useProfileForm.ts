import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { profileRegionFromRow } from '@/utils/profileLocation';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import type { QuebecPlace } from '@/data/quebecRegions';
import { parseStoredPhone, validatePhoneNumber } from '@/utils/phoneFormat';

export function useProfileForm() {
  const { profile, session, updateProfile, isConfigured } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useToast();

  const authEmail = session?.user?.email?.trim() ?? '';

  const [name, setName] = useState('');
  const [phone, setPhone] = useState<string | null>(null);
  const [cityDisplay, setCityDisplay] = useState('');
  const [cityCanon, setCityCanon] = useState('');
  const [province, setProvince] = useState('');
  const [country, setCountry] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);

  useEffect(() => {
    if (!profile && !session) return;
    const meta = (session?.user?.user_metadata ?? {}) as Record<string, unknown>;
    const metaName = typeof meta.full_name === 'string' ? meta.full_name : typeof meta.name === 'string' ? meta.name : '';
    setName(profile?.name?.trim() || metaName || '');
    setPhone(profile?.phone ?? null);
    const city = profile?.city?.trim() ?? '';
    setCityDisplay(city);
    setCityCanon(city);
    setProvince(profileRegionFromRow(profile) ?? '');
    setCountry(profile?.country?.trim() ?? '');
    setBio(profile?.bio?.trim() ?? '');
    setPhoneTouched(false);
  }, [profile, session]);

  const locationLabel = useMemo(() => {
    const parts = [cityCanon || cityDisplay, province, country].filter(Boolean);
    return parts.join(', ');
  }, [cityCanon, cityDisplay, province, country]);

  const phoneValidation = useMemo(() => {
    const { countryId, nationalNumber } = parseStoredPhone(phone);
    return validatePhoneNumber(countryId, nationalNumber);
  }, [phone]);

  const changeCityText = (text: string) => {
    setCityDisplay(text);
    setCityCanon('');
    setProvince('');
    setCountry('');
  };

  const pickCity = (place: QuebecPlace) => {
    setCityDisplay(place.label);
    setCityCanon(place.city);
    setProvince(place.region);
    setCountry(place.country);
  };

  const save = async (): Promise<boolean> => {
    setPhoneTouched(true);
    if (phone?.trim() && !phoneValidation.valid) {
      showToast(t('profile_form.phone_invalid'), 'error');
      return false;
    }

    if (!isConfigured || !session?.user) {
      showToast(t('app_pages.settings_saved'), 'info');
      return true;
    }

    setSaving(true);
    const err = await updateProfile({
      name: name.trim() || null,
      phone: phone?.trim() ? phone.trim() : null,
      city: (cityCanon.trim() || cityDisplay.trim()) || null,
      region: province.trim() || null,
      country: country.trim() || null,
      bio: bio.trim() || null,
    });
    setSaving(false);

    if (err) {
      showToast(t(err.messageKey, err.vars), 'error');
      return false;
    }

    showToast(t('app_pages.settings_saved'), 'success');
    return true;
  };

  return {
    authEmail,
    name,
    setName,
    phone,
    setPhone,
    cityDisplay,
    changeCityText,
    pickCity,
    province,
    country,
    locationLabel,
    bio,
    setBio,
    saving,
    save,
    phoneTouched,
    setPhoneTouched,
    phoneValidation,
    isConfigured: Boolean(isConfigured && session?.user),
  };
}
