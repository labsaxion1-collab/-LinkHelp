import { descriptionContainsContactInfo } from '@/utils/descriptionContactGuard';

export function isOtherServiceTypeValid(value: string): boolean {
  const text = value.trim();
  return text.length > 0 && text.length <= 80 && !/[\r\n]/.test(text) && !descriptionContainsContactInfo(text);
}

/** Same storage convention as moving/cleaning details; canonical taxonomy stays other/other. */
export function appendOtherServiceType(description: string, category: string, serviceType: string, label: string): string {
  return category === 'other' && isOtherServiceTypeValid(serviceType)
    ? `${description.trim()}\n\n${label}: ${serviceType.trim()}`
    : description;
}
