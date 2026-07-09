import { describe, expect, it } from 'vitest';
import { PUBLIC_PROFILE_SCROLL_ATTR } from './lockBodyScroll';

describe('lockBodyScroll', () => {
  it('exports scroll region marker attribute', () => {
    expect(PUBLIC_PROFILE_SCROLL_ATTR).toBe('data-public-profile-scroll');
  });
});
