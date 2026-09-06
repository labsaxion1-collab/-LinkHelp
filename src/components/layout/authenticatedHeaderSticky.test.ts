import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const root = new URL('../../../', import.meta.url);

function read(rel: string): string {
  return readFileSync(new URL(rel, root), 'utf8');
}

describe('authenticated header sticky', () => {
  it('keeps a single sticky header wrapper without overflow-x on the sticky ancestor', () => {
    const layout = read('src/components/layout/Layout.tsx');
    const nav = read('src/components/layout/Navbar.tsx');
    const css = read('src/styles/premium-theme.css');
    expect(layout).toContain('app-authenticated-header');
    expect(layout).toContain('sticky top-0 z-50');
    expect(layout).toContain('MobileBottomNav');
    expect(nav).toContain('data-testid="app-navbar"');
    expect(nav).not.toContain('sticky top-0');
    expect(css).toContain('padding-top: env(safe-area-inset-top, 0px)');

    const rootOpen = layout.indexOf("relative min-h-dvh flex flex-col");
    const rootChunk = layout.slice(rootOpen, rootOpen + 220);
    expect(rootChunk).not.toContain('overflow-x-hidden');
    expect(layout).toContain("showMobileChrome && 'pb-[calc(4.25rem+env(safe-area-inset-bottom))] md:pb-0'");
  });
});
