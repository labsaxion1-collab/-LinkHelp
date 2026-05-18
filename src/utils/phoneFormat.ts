import {
  PHONE_COUNTRIES,
  phoneCountryById,
  type PhoneCountry,
  type PhoneCountryId,
} from '@/data/phoneCountries';

export type ParsedPhone = {
  countryId: PhoneCountryId;
  nationalNumber: string;
};

const DEFAULT_COUNTRY: PhoneCountryId = 'CA';

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

export function parseStoredPhone(stored: string | null | undefined): ParsedPhone {
  if (!stored?.trim()) {
    return { countryId: DEFAULT_COUNTRY, nationalNumber: '' };
  }

  const compact = stored.trim().replace(/[^\d+]/g, '');
  const withPlus = compact.startsWith('+') ? compact : `+${compact}`;

  const sorted = [...PHONE_COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
  for (const country of sorted) {
    const dialDigits = country.dialCode.replace('+', '');
    if (withPlus.startsWith(country.dialCode)) {
      const national = withPlus.slice(country.dialCode.length).replace(/\D/g, '');
      return { countryId: country.id, nationalNumber: national };
    }
    if (withPlus.startsWith(`+${dialDigits}`)) {
      const national = withPlus.slice(1 + dialDigits.length).replace(/\D/g, '');
      return { countryId: country.id, nationalNumber: national };
    }
  }

  const national = digitsOnly(stored);
  return { countryId: DEFAULT_COUNTRY, nationalNumber: national };
}

export function buildFullPhone(countryId: PhoneCountryId, nationalNumber: string): string | null {
  const national = digitsOnly(nationalNumber);
  if (!national) return null;
  const country = phoneCountryById(countryId);
  return `${country.dialCode}${national}`;
}

export function validatePhoneNumber(
  countryId: PhoneCountryId,
  nationalNumber: string,
): { valid: boolean; errorKey?: string } {
  const national = digitsOnly(nationalNumber);
  if (!national) return { valid: true };

  if (!/^\d+$/.test(national)) {
    return { valid: false, errorKey: 'profile_form.phone_invalid' };
  }

  const country = phoneCountryById(countryId);
  if (national.length < country.minDigits || national.length > country.maxDigits) {
    return { valid: false, errorKey: 'profile_form.phone_invalid' };
  }

  return { valid: true };
}

export function formatPhoneDisplay(stored: string | null | undefined): string {
  if (!stored?.trim()) return '';
  const { countryId, nationalNumber } = parseStoredPhone(stored);
  if (!nationalNumber) return '';
  const country = phoneCountryById(countryId);
  return `${country.dialCode} ${nationalNumber}`;
}
