import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const root = new URL('../../../', import.meta.url);

function read(rel: string): string {
  return readFileSync(new URL(rel, root), 'utf8');
}

describe('authenticated header pin (app shell scrollport)', () => {
  it('pins only the blue header by scrolling <main>, not the whole document', () => {
    const layout = read('src/components/layout/Layout.tsx');
    const nav = read('src/components/layout/Navbar.tsx');
    const css = read('src/styles/premium-theme.css');
    const scrollTop = read('src/components/layout/ScrollToTop.tsx');

    expect(layout).toContain('app-authenticated-header');
    expect(layout).toContain('app-main-scroll');
    expect(layout).toContain("data-header-pin={isAppShell ? 'shell' : 'sticky'}");
    expect(layout).toContain('h-dvh max-h-dvh overflow-hidden');
    expect(layout).toContain('overflow-y-auto overscroll-y-contain');
    expect(layout).toContain('MobileBottomNav');
    // Sticky is not the app-shell pin strategy (fails under overflow-x ancestors / PWA).
    expect(layout).not.toContain('sticky top-0 z-50');
    expect(nav).toContain('data-testid="app-navbar"');
    expect(nav).not.toContain('sticky top-0');
    expect(css).toContain('padding-top: env(safe-area-inset-top, 0px)');
    expect(css).toMatch(/\.lh-nav-premium[\s\S]*?background:\s*#020818/);
    expect(scrollTop).toContain('app-main-scroll');
    expect(scrollTop).toContain('main.scrollTo');

    const rootOpen = layout.indexOf("relative flex flex-col font-sans");
    const rootChunk = layout.slice(rootOpen, rootOpen + 280);
    expect(rootChunk).not.toContain('overflow-x-hidden');
  });

  it('keeps VIP overlay above the pinned header', () => {
    const overlay = read('src/components/design-system/LhCardOverlay.tsx');
    expect(overlay).toContain("elevated: 'z-[1000]'");
    expect(overlay).toContain('safe-area-inset-top');
    expect(overlay).toContain('safe-area-inset-bottom');
  });

  it('does not pin bottom nav or page sections via the header wrapper', () => {
    const layout = read('src/components/layout/Layout.tsx');
    const headerIdx = layout.indexOf('app-authenticated-header');
    const headerChunk = layout.slice(headerIdx - 120, headerIdx + 220);
    expect(headerChunk).toContain('<Navbar />');
    expect(headerChunk).not.toContain('<MobileBottomNav');
    expect(headerChunk).not.toContain('<Outlet');
    expect(layout.indexOf('<MobileBottomNav')).toBeGreaterThan(layout.indexOf('</main>'));
  });
});
