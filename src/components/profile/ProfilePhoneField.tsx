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

const COUNTRY_FLAGS: Record<PhoneCountryId, string> = {
  CA: '🇨🇦',
  US: '🇺🇸',
  BR: '🇧🇷',
  PT: '🇵🇹',
  FR: '🇫🇷',
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
      <div className="flex gap-2">
        <label className="relative min-h-[48px] w-[104px] shrink-0 overflow-hidden rounded-xl border-2 border-gray-200 bg-gray-50 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-50">
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center gap-1 text-base font-black text-gray-900">
            <span>{COUNTRY_FLAGS[countryId]}</span>
            <span>{phoneCountryById(countryId).dialCode}</span>
          </span>
          <select
            id={selectId}
            disabled={disabled}
            value={countryId}
            onChange={(e) => {
              const next = e.target.value as PhoneCountryId;
              setCountryId(next);
              emitChange(next, nationalNumber);
            }}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
            aria-label={t('profile_form.country_code')}
          >
            {PHONE_COUNTRIES.map((c) => (
              <option key={c.id} value={c.id}>
                {phoneCountryLabel(c.id, t)} ({c.dialCode})
              </option>
            ))}
          </select>
        </label>
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
