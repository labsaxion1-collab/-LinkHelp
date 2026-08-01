import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('HelperTermsGateModal — viewport-centered portal', () => {
  it('renders via createPortal, centered, with body scroll lock and sticky chrome', async () => {
    const src = await readFile(resolve('src/components/auth/HelperTermsGateModal.tsx'), 'utf8');
    expect(src).toContain('createPortal');
    expect(src).toContain('document.body');
    expect(src).toContain('document.body.style.overflow');
    expect(src).toContain('items-center justify-center');
    expect(src).not.toContain('items-end');
    expect(src).toContain('data-modal-variant="centered-viewport"');
    expect(src).toContain('max-h-[min(90dvh,calc(100dvh-1.5rem))]');
    expect(src).toContain('overflow-y-auto');
    expect(src).toContain('helper-terms-modal-close');
    expect(src).toContain('z-[200]');
    expect(src).toContain('env(safe-area-inset-top)');
  });
});
