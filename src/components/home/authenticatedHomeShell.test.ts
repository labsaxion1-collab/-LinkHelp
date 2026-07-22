/**
 * Authenticated home shell — single persistent layer, no double skeleton.
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Authenticated home loading shell', () => {
  it('Layout monta PersistentHomeDashboardShell acima do Suspense', async () => {
    const src = await readFile(resolve('src/components/layout/Layout.tsx'), 'utf8');
    expect(src).toContain('PersistentHomeDashboardShell');
    expect(src).toContain('MainSuspenseFallback');
    expect(src).not.toMatch(/Suspense fallback=\{<PageLoader/);
  });

  it('Suspense da Home autenticada não duplica skeleton (fallback null)', async () => {
    const main = await readFile(resolve('src/components/routing/MainSuspenseFallback.tsx'), 'utf8');
    expect(main).toContain('isAuthenticatedHomeDashboardPath');
    expect(main).toMatch(/isAuthenticatedHomeDashboardPath[\s\S]*return null/);
    expect(main).not.toContain('animate-spin');
  });

  it('ProtectedRoute usa placeholder, não AuthenticatedHomeShellSkeleton', async () => {
    const src = await readFile(resolve('src/components/auth/ProtectedRoute.tsx'), 'utf8');
    expect(src).not.toContain('PageLoader');
    expect(src).not.toContain('AuthenticatedHomeShellSkeleton');
    expect(src).toContain('HomeDashboardRoutePlaceholder');
  });

  it('RoleRoute usa placeholder em vez de skeleton duplicado', async () => {
    const src = await readFile(resolve('src/components/auth/RoleRoute.tsx'), 'utf8');
    expect(src).toContain('HomeDashboardRoutePlaceholder');
    expect(src).not.toContain('AuthenticatedHomeShellSkeleton');
  });

  it('shell estrutural único via HomeDashboardShellContext', async () => {
    const ctx = await readFile(resolve('src/components/home/HomeDashboardShellContext.tsx'), 'utf8');
    const skeleton = await readFile(resolve('src/components/home/AuthenticatedHomeShellSkeleton.tsx'), 'utf8');
    expect(ctx).toContain('PersistentHomeDashboardShell');
    expect(ctx).toContain('AuthenticatedHomeShellSkeleton');
    expect(skeleton).toContain('GamificationHeroSkeleton');
    expect(ctx).toContain('useMarkHomeDashboardSurfaceReady');
  });

  it('dashboards marcam surface ready ao montar', async () => {
    const client = await readFile(resolve('src/pages/client/ClientDashboard.tsx'), 'utf8');
    const helper = await readFile(resolve('src/pages/helper/HelperDashboard.tsx'), 'utf8');
    expect(client).toContain('useMarkHomeDashboardSurfaceReady');
    expect(helper).toContain('useMarkHomeDashboardSurfaceReady');
  });

  it('HeroPictureLayer mantém fallback PNG (WebP failure path)', async () => {
    const src = await readFile(resolve('src/components/hero/HeroPictureLayer.tsx'), 'utf8');
    expect(src).toContain('layer.png');
    expect(src).toContain('image/webp');
  });

  it('AppDataProvider sempre renderiza children', async () => {
    const src = await readFile(resolve('src/context/AppDataContext.tsx'), 'utf8');
    const providerBlock = src.slice(src.indexOf('export function AppDataProvider'), src.indexOf('export function useAppData'));
    expect(providerBlock).toContain('{children}');
    expect(providerBlock).not.toMatch(/if\s*\(\s*loading\s*\)\s*return\s+null/);
  });

  it('ranking engines e copy de nível não alterados', async () => {
    const layout = await readFile(resolve('src/components/layout/Layout.tsx'), 'utf8');
    const shell = await readFile(resolve('src/components/home/AuthenticatedHomeShellSkeleton.tsx'), 'utf8');
    expect(layout).not.toMatch(/levelEngine|progressEngine|threshold/i);
    expect(shell).not.toMatch(/Iniciante|ranking|threshold/i);
  });

  it('Navbar e bottom nav permanecem no Layout durante loading', async () => {
    const src = await readFile(resolve('src/components/layout/Layout.tsx'), 'utf8');
    expect(src).toContain('<Navbar');
    expect(src).toContain('MobileBottomNav');
    expect(src).toContain('PersistentHomeDashboardShell');
  });
});

describe('dashboardPreload', () => {
  it('módulo expõe preload idempotente por role', async () => {
    const src = await readFile(resolve('src/routes/dashboardPreload.ts'), 'utf8');
    expect(src).toContain('clientPreloadPromise');
    expect(src).toContain('helperPreloadPromise');
    expect(src).toContain('preloadDashboardForRole');
    expect(src).toMatch(/catch\(\(\) => undefined\)/);
  });

  it('DashboardPreloadEffect só dispara após profile real', async () => {
    const src = await readFile(resolve('src/components/routing/DashboardPreloadEffect.tsx'), 'utf8');
    expect(src).toContain('profile.id !== userId');
    expect(src).toContain('preloadDashboardForRole');
  });
});
