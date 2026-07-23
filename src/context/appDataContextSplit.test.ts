/**
 * AppData context split — notification updates must not subscribe UI that only needs jobs.
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('AppDataContext split (performance)', () => {
  it('expõe contextos granulares e useAppData compõe backward-compat', async () => {
    const src = await readFile(resolve('src/context/AppDataContext.tsx'), 'utf8');
    expect(src).toContain('AppDataCoreContext');
    expect(src).toContain('AppDataNotificationsContext');
    expect(src).toContain('AppDataActionsContext');
    expect(src).toContain('export function useAppDataCore');
    expect(src).toContain('export function useAppDataNotifications');
    expect(src).toContain('export function useAppDataActionsRef');
    expect(src).toMatch(/const coreState = useMemo/);
    expect(src).not.toContain('AppDataContext.Provider');
  });

  it('sino de notificações não usa useAppData() (evita re-render por jobs/realtime)', async () => {
    const dropdown = await readFile(resolve('src/components/layout/NotificationsDropdown.tsx'), 'utf8');
    expect(dropdown).toContain('useAppDataActionsRef');
    expect(dropdown).not.toMatch(/useAppData\s*\(/);
    const clearBtn = await readFile(resolve('src/components/notifications/ClearNotificationsButton.tsx'), 'utf8');
    expect(clearBtn).toContain('useAppDataActionsRef');
    expect(clearBtn).not.toMatch(/useAppData\s*\(/);
  });

  it('useUserNotifications lê apenas AppDataNotificationsContext', async () => {
    const hook = await readFile(resolve('src/hooks/useUserNotifications.ts'), 'utf8');
    expect(hook).toContain('useAppDataNotifications');
    expect(hook).not.toMatch(/useAppData\s*\(/);
  });

  it('dashboardPreload é idempotente por role', async () => {
    const src = await readFile(resolve('src/routes/dashboardPreload.ts'), 'utf8');
    expect(src).toContain('clientPreloadPromise');
    expect(src).toContain('helperPreloadPromise');
    expect(src).toMatch(/if \(!clientPreloadPromise\)/);
    expect(src).toMatch(/if \(!helperPreloadPromise\)/);
  });

  it('ClientDashboard usa useAppDataCore e não useAppData()', async () => {
    const src = await readFile(resolve('src/pages/client/ClientDashboard.tsx'), 'utf8');
    expect(src).toContain('useAppDataCore');
    expect(src).toContain('useAppDataActionsRef');
    expect(src).not.toMatch(/useAppData\s*\(/);
    expect(src).toContain('ClientDashboardHeroSlot');
    expect(src).toContain('ClientDashboardMapSidebar');
    expect(src).not.toContain('useAppDataNotifications');
  });

  it('HelperDashboard usa useAppDataCore e não useAppData()', async () => {
    const src = await readFile(resolve('src/pages/helper/HelperDashboard.tsx'), 'utf8');
    expect(src).toContain('useAppDataCore');
    expect(src).toContain('useAppDataActionsRef');
    expect(src).not.toMatch(/useAppData\s*\(/);
    expect(src).toContain('HelperDashboardHeroSlot');
  });

  it('Hero slots não assinam AppDataContext', async () => {
    const clientHero = await readFile(resolve('src/components/client/ClientDashboardHeroSlot.tsx'), 'utf8');
    const helperHero = await readFile(resolve('src/components/helper/HelperDashboardHeroSlot.tsx'), 'utf8');
    expect(clientHero).not.toMatch(/useAppData/);
    expect(helperHero).not.toMatch(/useAppData/);
  });

  it('exporta useAppDataActions e contexts de teste', async () => {
    const src = await readFile(resolve('src/context/AppDataContext.tsx'), 'utf8');
    expect(src).toContain('export function useAppDataActions');
    expect(src).toContain('appDataSplitTestContexts');
  });

  it('logout / userId limpa estado local quando remoto indisponível', async () => {
    const src = await readFile(resolve('src/context/AppDataContext.tsx'), 'utf8');
    expect(src).toMatch(/setNotifications\(\[\]\)/);
    expect(src).toMatch(/loadUserId !== userId/);
  });
});
