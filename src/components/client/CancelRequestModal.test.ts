import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

describe('CancelRequestModal compact centered presentation', () => {
  it('uses a centered compact dialog instead of PremiumResponsiveModal bottom sheet', async () => {
    const src = await readFile(resolve('src/components/client/CancelRequestModal.tsx'), 'utf8');
    expect(src).toContain('data-modal-variant="centered-compact"');
    expect(src).toContain('cancel-request-modal');
    expect(src).toContain('role="dialog"');
    expect(src).toContain('aria-modal="true"');
    expect(src).toContain('aria-labelledby');
    expect(src).toContain('aria-describedby');
    expect(src).toContain('max-w-[360px]');
    expect(src).toContain('w-[calc(100vw-32px)]');
    expect(src).toContain('items-center justify-center');
    expect(src).toContain('cancel-request-modal-keep');
    expect(src).toContain('cancel-request-modal-confirm');
    expect(src).toContain('cancel-request-modal-close');
    expect(src).toContain('cancel-request-modal-credit-warning');
    expect(src).toContain('Escape');
    expect(src).toContain('document.body.style.overflow');
    expect(src).toContain('keepButtonRef');
    expect(src).toContain('previouslyFocusedRef');
    expect(src).not.toContain('PremiumResponsiveModal');
    expect(src).not.toContain('items-end');
    expect(src).not.toContain('rounded-t-');
    expect(src).not.toContain('slide-in-from-bottom');
  });

  it('orders safe keep action before destructive confirm', async () => {
    const src = await readFile(resolve('src/components/client/CancelRequestModal.tsx'), 'utf8');
    const keepIdx = src.indexOf('cancel-request-modal-keep');
    const confirmIdx = src.indexOf('cancel-request-modal-confirm');
    expect(keepIdx).toBeGreaterThan(-1);
    expect(confirmIdx).toBeGreaterThan(keepIdx);
  });

  it('documents helper LC refund warning aligned with remoteCancelClientRequest', async () => {
    const src = await readFile(resolve('src/components/client/CancelRequestModal.tsx'), 'utf8');
    expect(src).toContain('helpers receive full LC refunds');
    expect(src).toContain('job_actions.cancel_modal_warning');
    const remote = await readFile(resolve('src/services/supabase/appDataRemote.ts'), 'utf8');
    expect(remote).toContain('full helper credit refunds');
    const en = await readFile(resolve('src/translations/en/index.ts'), 'utf8');
    const pt = await readFile(resolve('src/translations/pt/index.ts'), 'utf8');
    const fr = await readFile(resolve('src/translations/fr/index.ts'), 'utf8');
    expect(en).toContain('LinkCredits spent by Helps on this request will be refunded');
    expect(pt).toContain('Os LinkCredits gastos pelos Helps neste chamado serão devolvidos');
    expect(fr).toContain('Les LinkCredits dépensés par les Helps sur cette demande seront remboursés');
    expect(en).not.toContain('credits used on this request will not be refunded');
    expect(pt).not.toContain('créditos utilizados neste chamado não serão devolvidos');
  });

  it('keeps ClientDashboard wiring for confirm once + toast on success', async () => {
    const dash = await readFile(resolve('src/pages/client/ClientDashboard.tsx'), 'utf8');
    expect(dash).toContain('CancelRequestModal');
    expect(dash).toContain('handleConfirmCancelJob');
    expect(dash).toContain('cancellingJobId');
    expect(dash).toContain('request_cancelled_toast');
    expect(dash).toContain("showToast(t('client_dashboard.request_cancelled_toast'), 'success')");
    expect(dash).toContain('formatRequestLifecycleError');
  });
});
