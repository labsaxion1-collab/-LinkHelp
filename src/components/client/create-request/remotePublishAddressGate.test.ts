import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('CreateRequestModal — remote publish address gate', () => {
  it('skips address_required toast for remote and clears remote coords', async () => {
    const src = await readFile(resolve('src/components/client/create-request/CreateRequestModal.tsx'), 'utf8');
    expect(src).toContain('publishRequiresMapAddress');
    expect(src).toContain('publishCoordinatesForMode');
    expect(src).toContain('requiresAddress && !isValidRequestAddress(requestAddress)');
    expect(src).toContain("address: resolvedServiceMode === 'remote' ? null");
    expect(src).toContain('confirm_date_required');
    expect(src).toContain('confirm_time_required');
    // Legacy unconditional address gate must not remain.
    expect(src).not.toMatch(
      /const needsAddress =\s*selectedCategory === 'moving'[\s\S]*?: !isValidRequestAddress\(requestAddress\);/,
    );
  });
});

describe('CreateRequestReviewStep — remote hides location row', () => {
  it('omits location section when modality is remote', async () => {
    const src = await readFile(
      resolve('src/components/client/create-request/CreateRequestReviewStep.tsx'),
      'utf8',
    );
    expect(src).toContain("resolvedMode === 'remote' ? null");
    expect(src).not.toContain("resolvedMode === 'remote' ? t('create_modal.service_mode_remote') : locationDisplay");
  });
});

describe('CreateRequestConfirmStep — schedule required both modes', () => {
  it('keeps date and time completeness helpers', async () => {
    const src = await readFile(
      resolve('src/components/client/create-request/CreateRequestConfirmStep.tsx'),
      'utf8',
    );
    expect(src).toContain('isConfirmStepComplete');
    expect(src).toContain('isPreferredDateComplete');
    expect(src).toContain('isPreferredTimeComplete');
  });
});
