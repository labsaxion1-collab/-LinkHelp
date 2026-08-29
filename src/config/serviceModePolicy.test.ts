import { describe, expect, it } from 'vitest';
import { allowedServiceModes, getServiceModePolicy } from '@/config/serviceModePolicy';

describe('serviceModePolicy', () => {
  it('marks cleaning as in-person only', () => {
    expect(getServiceModePolicy('cleaning', 'house')).toBe('in_person_only');
    expect(allowedServiceModes('cleaning', 'house')).toEqual(['in_person']);
  });

  it('marks translation document as remote only', () => {
    expect(getServiceModePolicy('translation', 'document')).toBe('remote_only');
    expect(allowedServiceModes('translation', 'document')).toEqual(['remote']);
  });

  it('marks translation consultation as both', () => {
    expect(getServiceModePolicy('translation', 'consultation')).toBe('both');
    expect(allowedServiceModes('translation', 'consultation')).toEqual(['remote', 'in_person']);
  });

  it('marks beauty waxing (Depilação) as in-person only', () => {
    expect(getServiceModePolicy('beauty', 'waxing')).toBe('in_person_only');
    expect(allowedServiceModes('beauty', 'waxing')).toEqual(['in_person']);
  });

  it('marks tech format as both', () => {
    expect(getServiceModePolicy('tech', 'format')).toBe('both');
    expect(allowedServiceModes('tech', 'format')).toEqual(['remote', 'in_person']);
  });

  it('requires choice when subcategory missing', () => {
    expect(getServiceModePolicy('cleaning', '')).toBe('both');
  });
});
