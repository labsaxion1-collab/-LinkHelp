import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('createJob remote publish refresh', () => {
  it('awaits RPC then refreshRemoteBootstrap before returning (toast waits on real success)', async () => {
    const src = await readFile(resolve('src/context/AppDataContext.tsx'), 'utf8');
    const createJobStart = src.indexOf('const createJob = async');
    const createJobBlock = src.slice(createJobStart, createJobStart + 2200);
    expect(createJobBlock).toContain('await remoteCreateRequest');
    expect(createJobBlock).toContain('await refreshRemoteBootstrap()');
    expect(createJobBlock.indexOf('await remoteCreateRequest')).toBeLessThan(
      createJobBlock.indexOf('await refreshRemoteBootstrap()'),
    );
    expect(createJobBlock).toContain('fetchRequestRowById');
    expect(createJobBlock).toContain('triggerGamificationRecalculate');
  });
});
