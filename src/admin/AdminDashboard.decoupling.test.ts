import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('../pages/admin/AdminDashboard.tsx', import.meta.url), 'utf8');

describe('AdminDashboard data isolation', () => {
  it('uses the admin summary hook and does not depend on AppDataContext', () => {
    expect(source).toContain('useAdminDashboardSummary');
    expect(source).not.toContain('useAppData');
    expect(source).not.toContain("@/context/AppDataContext");
  });
});
