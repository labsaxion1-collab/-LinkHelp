import { useEffect, useId, useMemo, useState } from 'react';
import { clsx } from 'clsx';
import {
  PHONE_COUNTRIES,
  phoneCountryById,
  phoneCountryLabel,
  type PhoneCountryId,
} from '@/data/phoneCountries';
import { buildFullPhone, parseStoredPhone, validatePhoneNumber } from '@/utils/phoneFormat';

type Props = {
  label: string;
  value: string | null | undefined;
  onChange: (fullPhone: string | null) => void;
  disabled?: boolean;
  t: (key: string) => string;
};

export function ProfilePhoneField({ label, value, onChange, disabled, t }: Props) {
  const selectId = useId();
  const inputId = `${selectId}-number`;

  const parsed = useMemo(() => parseStoredPhone(value), [value]);
  const [countryId, setCountryId] = useState<PhoneCountryId>(parsed.countryId);
  const [nationalNumber, setNationalNumber] = useState(parsed.nationalNumber);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    setCountryId(parsed.countryId);
    setNationalNumber(parsed.nationalNumber);
  }, [parsed.countryId, parsed.nationalNumber]);

  const validation = validatePhoneNumber(countryId, nationalNumber);
  const showError = touched && !validation.valid;

  const emitChange = (nextCountry: PhoneCountryId, nextNational: string) => {
    onChange(buildFullPhone(nextCountry, nextNational));
  };

  return (
    <div>
      <label htmlFor={inputId} className="text-sm font-bold text-gray-700 block mb-2">
        {label}
      </label>
      <div className="flex flex-wrap sm:flex-nowrap gap-2">
        <select
          id={selectId}
          disabled={disabled}
          value={countryId}
          onChange={(e) => {
            const next = e.target.value as PhoneCountryId;
            setCountryId(next);
            emitChange(next, nationalNumber);
          }}
          className="min-h-[48px] rounded-xl border-2 border-gray-200 bg-gray-50 px-2 py-2.5 text-sm font-bold text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-50 disabled:opacity-60"
          aria-label={t('profile_form.country_code')}
        >
          {PHONE_COUNTRIES.map((c) => (
            <option key={c.id} value={c.id}>
              {phoneCountryLabel(c.id, t)} ({c.dialCode})
            </option>
          ))}
        </select>
        <span className="flex items-center min-h-[48px] px-3 rounded-xl border-2 border-gray-200 bg-gray-100 text-sm font-bold text-gray-700 shrink-0">
          {phoneCountryById(countryId).dialCode}
        </span>
        <input
          id={inputId}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          disabled={disabled}
          value={nationalNumber}
          onChange={(e) => {
            const next = e.target.value.replace(/\D/g, '');
            setNationalNumber(next);
            emitChange(countryId, next);
          }}
          onBlur={() => setTouched(true)}
          placeholder={t('profile_form.phone_placeholder')}
          className={clsx(
            'flex-1 min-h-[48px] min-w-0 rounded-xl border-2 bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-50 disabled:opacity-60',
            showError ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500',
          )}
        />
      </div>
      {showError && validation.errorKey ? (
        <p className="mt-1.5 text-xs font-semibold text-red-600">{t(validation.errorKey)}</p>
      ) : (
        <p className="mt-1.5 text-xs text-gray-500">{t('profile_form.phone_hint')}</p>
      )}
    </div>
  );
}

