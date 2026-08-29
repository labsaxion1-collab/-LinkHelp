import { describe, expect, it } from 'vitest';
import {
  isRequestCancelEnabled,
  isRequestLifecycleControlsEnabled,
} from '@/config/requestLifecycleCapability';

describe('requestLifecycleCapability', () => {
  it('enables cancel on all hosts once 0065 is deployed', () => {
    expect(isRequestCancelEnabled('localhost')).toBe(true);
    expect(isRequestCancelEnabled('teste.linkhelp.app')).toBe(true);
    expect(isRequestCancelEnabled('app.linkhelp.app')).toBe(true);
  });

  it('disables legacy pause/resume controls everywhere', () => {
    expect(isRequestLifecycleControlsEnabled('localhost')).toBe(false);
    expect(isRequestLifecycleControlsEnabled('app.linkhelp.app')).toBe(false);
  });
});
