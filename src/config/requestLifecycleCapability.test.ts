import { describe, expect, it } from 'vitest';
import { isRequestLifecycleControlsEnabled } from '@/config/requestLifecycleCapability';

describe('requestLifecycleCapability', () => {
  it('disables on local, preview, and teste staging host', () => {
    expect(isRequestLifecycleControlsEnabled('localhost')).toBe(false);
    expect(isRequestLifecycleControlsEnabled('127.0.0.1')).toBe(false);
    expect(isRequestLifecycleControlsEnabled('linkhelp-git-staging-xxx.vercel.app')).toBe(false);
    expect(isRequestLifecycleControlsEnabled('teste.linkhelp.app')).toBe(false);
  });

  it('keeps enabled on production marketplace hosts', () => {
    expect(isRequestLifecycleControlsEnabled('app.linkhelp.app')).toBe(true);
    expect(isRequestLifecycleControlsEnabled('www.linkhelp.app')).toBe(true);
    expect(isRequestLifecycleControlsEnabled('flux.linkhelp.app')).toBe(true);
    expect(isRequestLifecycleControlsEnabled('linkhelp.app')).toBe(true);
  });
});
