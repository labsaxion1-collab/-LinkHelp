import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const modal = readFileSync('src/components/client/create-request/CreateRequestModal.tsx', 'utf8');
const bootstrap = readFileSync('src/services/supabase/appDataRemote.ts', 'utf8');
const patch = readFileSync('src/services/supabase/appDataRealtimePatch.ts', 'utf8');

describe('publish feedback and bootstrap fallback wiring', () => {
  it('shows an explicit success toast after createJob resolves', () => {
    expect(modal).toContain("showToast(t('create_modal.publish_success'), 'success')");
    expect(modal.indexOf('await createJob(')).toBeLessThan(modal.indexOf("showToast(t('create_modal.publish_success')"));
    expect(modal.indexOf("showToast(t('create_modal.publish_success')")).toBeLessThan(modal.indexOf('performClose()'));
  });

  it('keeps publish disabled while publishing is in flight', () => {
    expect(modal).toContain('if (publishing) return;');
    expect(modal).toContain('disabled={publishing}');
    expect(modal).toContain('setPublishing(true)');
    expect(modal).toContain('setPublishing(false)');
  });

  it('does not auto-retry publish on success path', () => {
    const publishBlock = modal.slice(modal.indexOf('const handlePublish'), modal.indexOf('const addressStepComplete'));
    expect(publishBlock.match(/await createJob\(/g)?.length).toBe(1);
  });

  it('uses shared optional-column fallback in bootstrap and fetchRequestRowById', () => {
    expect(bootstrap).toContain("queryWithOptionalColumnFallback('requests', 'bootstrap requests'");
    expect(bootstrap).toContain("queryWithOptionalColumnFallback('applications', 'bootstrap applications'");
    expect(patch).toContain("queryWithOptionalColumnFallback('requests', 'fetchRequestRowById'");
    expect(patch).toContain("queryWithOptionalColumnFallback('applications', 'fetchApplicationRowById'");
  });
});

describe('create_modal.publish_success copy', () => {
  it('uses the requested Portuguese confirmation text', () => {
    const pt = readFileSync('src/translations/pt/index.ts', 'utf8');
    expect(pt).toContain("publish_success: 'Pedido publicado com sucesso — 1 LC utilizado'");
  });
});
