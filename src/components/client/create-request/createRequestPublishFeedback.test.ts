import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const modal = readFileSync('src/components/client/create-request/CreateRequestModal.tsx', 'utf8');
const bootstrap = readFileSync('src/services/supabase/appDataRemote.ts', 'utf8');
const patch = readFileSync('src/services/supabase/appDataRealtimePatch.ts', 'utf8');

function extractHandlePublishBlock(source: string): string {
  const start = source.indexOf('const handlePublish');
  const end = source.indexOf('const addressStepComplete', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe('publish feedback and bootstrap fallback wiring', () => {
  it('shows an explicit success toast after createJob resolves', () => {
    const publishBlock = extractHandlePublishBlock(modal);
    expect(publishBlock).toContain("showToast(t('create_modal.publish_success'), 'success')");
    expect(publishBlock.indexOf('await createJob(')).toBeLessThan(
      publishBlock.indexOf("showToast(t('create_modal.publish_success')"),
    );
    expect(publishBlock.indexOf("showToast(t('create_modal.publish_success')")).toBeLessThan(
      publishBlock.indexOf('performClose()'),
    );
  });

  it('keeps publish disabled while publishing is in flight', () => {
    expect(modal).toContain('if (publishing) return;');
    expect(modal).toContain('disabled={publishing}');
    expect(modal).toContain('setPublishing(true)');
    expect(modal).toContain('setPublishing(false)');
  });

  it('does not auto-retry publish on success path', () => {
    const publishBlock = extractHandlePublishBlock(modal);
    expect(publishBlock.match(/await createJob\(/g)?.length).toBe(1);
  });

  it('uses shared optional-column fallback in bootstrap and fetchRequestRowById', () => {
    expect(bootstrap).toMatch(
      /queryWithOptionalColumnFallback\(\s*'requests',\s*'bootstrap requests'/,
    );
    expect(bootstrap).toMatch(
      /queryWithOptionalColumnFallback\(\s*'applications',\s*'bootstrap applications'/,
    );
    expect(patch).toMatch(
      /queryWithOptionalColumnFallback\(\s*'requests',\s*'fetchRequestRowById'/,
    );
    expect(patch).toMatch(
      /queryWithOptionalColumnFallback\(\s*'applications',\s*'fetchApplicationRowById'/,
    );
  });
});

describe('create_modal.publish_success copy', () => {
  it('uses the requested Portuguese confirmation text', () => {
    const pt = readFileSync('src/translations/pt/index.ts', 'utf8');
    expect(pt).toContain("publish_success: 'Pedido publicado com sucesso — 1 LC utilizado'");
  });
});
