import { describe, expect, it } from 'vitest';
import {
  publishCoordinatesForMode,
  publishRequiresCoordinates,
  publishRequiresMapAddress,
} from '@/utils/publishAddressPolicy';

describe('publishAddressPolicy — remote vs in_person', () => {
  it('remote does not require map address or coordinates', () => {
    expect(
      publishRequiresMapAddress({
        category: 'translation',
        serviceMode: 'remote',
        baselineFinanceEnabled: true,
      }),
    ).toBe(false);
    expect(
      publishRequiresCoordinates({
        category: 'translation',
        serviceMode: 'remote',
        baselineFinanceEnabled: true,
      }),
    ).toBe(false);
  });

  it('remote payload clears coordinates (no distance inputs)', () => {
    expect(publishCoordinatesForMode('remote', 45.5, -73.5)).toEqual({
      latitude: null,
      longitude: null,
    });
  });

  it('in_person still requires address and coordinates when baseline is on', () => {
    expect(
      publishRequiresMapAddress({
        category: 'automotive',
        serviceMode: 'in_person',
        baselineFinanceEnabled: true,
      }),
    ).toBe(true);
    expect(
      publishRequiresCoordinates({
        category: 'automotive',
        serviceMode: 'in_person',
        baselineFinanceEnabled: true,
      }),
    ).toBe(true);
    expect(publishCoordinatesForMode('in_person', 45.5, -73.5)).toEqual({
      latitude: 45.5,
      longitude: -73.5,
    });
  });

  it('moving always requires addresses regardless of mode', () => {
    expect(
      publishRequiresMapAddress({
        category: 'moving',
        serviceMode: 'remote',
        baselineFinanceEnabled: true,
      }),
    ).toBe(true);
  });
});
