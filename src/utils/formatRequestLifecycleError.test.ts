import { describe, expect, it } from 'vitest';
import { formatRequestLifecycleError } from '@/utils/formatRequestLifecycleError';

const t = (key: string) => key;

describe('formatRequestLifecycleError', () => {
  it('maps missing backend RPC to clear message', () => {
    expect(formatRequestLifecycleError(new Error('REQUEST_LIFECYCLE_BACKEND_NOT_READY'), t)).toBe(
      'client_dashboard.lifecycle_backend_not_ready',
    );
  });

  it('maps not pausable errors', () => {
    expect(formatRequestLifecycleError(new Error('REQUEST_NOT_PAUSABLE'), t)).toBe(
      'client_dashboard.lifecycle_not_pausable',
    );
  });
});
