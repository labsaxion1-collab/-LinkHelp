export type PhoneCountryId = 'CA' | 'BR' | 'US' | 'PT' | 'FR';

export type PhoneCountry = {
  id: PhoneCountryId;
  dialCode: string;
  minDigits: number;
  maxDigits: number;
};

/** Dial codes for profile phone input (ordered for matching longest first in parser). */
export const PHONE_COUNTRIES: PhoneCountry[] = [
  { id: 'BR', dialCode: '+55', minDigits: 10, maxDigits: 11 },
  { id: 'PT', dialCode: '+351', minDigits: 9, maxDigits: 9 },
  { id: 'FR', dialCode: '+33', minDigits: 9, maxDigits: 9 },
  { id: 'CA', dialCode: '+1', minDigits: 10, maxDigits: 10 },
  { id: 'US', dialCode: '+1', minDigits: 10, maxDigits: 10 },
];

export function phoneCountryById(id: PhoneCountryId): PhoneCountry {
  return PHONE_COUNTRIES.find((c) => c.id === id) ?? PHONE_COUNTRIES[0];
}

export function phoneCountryLabel(id: PhoneCountryId, t: (key: string) => string): string {
  return t(`profile_form.country_${id.toLowerCase()}`);
}
