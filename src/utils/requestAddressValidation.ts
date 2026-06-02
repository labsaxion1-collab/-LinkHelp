import type { RequestAddressValue } from '@/components/client/create-request/RequestAddressInput';

export function isValidRequestAddress(addr: RequestAddressValue): boolean {
  return Boolean(addr.display.trim()) && addr.latitude != null && addr.longitude != null;
}
