import { describe, expect, it } from 'vitest';
import type { Job } from '@/types/job';
import {
  classifyClientRequest,
  partitionClientRequests,
} from '@/utils/clientHistoryBuckets';

function job(partial: Partial<Job> & Pick<Job, 'id' | 'status'>): Job {
  return {
    clientId: 'c1',
    helperId: null,
    title: 't',
    description: 'd',
    category: 'cleaning',
    budget: 50,
    createdAt: 1_700_000_000_000,
    preferredDate: undefined,
    expiresAt: undefined,
    ...partial,
  } as Job;
}

describe('clientHistoryBuckets', () => {
  const now = 1_700_100_000_000;

  it('routes completed / cancelled / expired status to history buckets', () => {
    expect(classifyClientRequest(job({ id: '1', status: 'completed' }), now)).toBe('completed');
    expect(classifyClientRequest(job({ id: '2', status: 'cancelled' }), now)).toBe('closed');
    expect(classifyClientRequest(job({ id: '3', status: 'expired' }), now)).toBe('closed');
  });

  it('keeps open with past preferredDate but future expiresAt in waiting', () => {
    const j = job({
      id: '4',
      status: 'open',
      preferredDate: '2020-01-01',
      expiresAt: now + 86_400_000,
    });
    expect(classifyClientRequest(j, now)).toBe('waiting');
  });

  it('uses expiresAt over preferredDate for open/paused expiry', () => {
    const expired = job({
      id: '5',
      status: 'open',
      preferredDate: '2099-01-01',
      expiresAt: now - 1_000,
    });
    expect(classifyClientRequest(expired, now)).toBe('closed');
  });

  it('never reclassifies in_progress / completed / cancelled by dates', () => {
    expect(
      classifyClientRequest(
        job({ id: '6', status: 'in_progress', expiresAt: now - 1_000, preferredDate: '2020-01-01' }),
        now,
      ),
    ).toBe('in_progress');
    expect(
      classifyClientRequest(
        job({ id: '7', status: 'completed', expiresAt: now - 1_000 }),
        now,
      ),
    ).toBe('completed');
    expect(
      classifyClientRequest(
        job({ id: '8', status: 'cancelled', expiresAt: now - 1_000 }),
        now,
      ),
    ).toBe('closed');
  });

  it('partitions mutually exclusive buckets with no duplicates', () => {
    const jobs = [
      job({ id: 'w', status: 'open', expiresAt: now + 1_000, createdAt: 3 }),
      job({ id: 'p', status: 'in_progress', createdAt: 2 }),
      job({ id: 'done', status: 'completed', createdAt: 4 }),
      job({ id: 'x', status: 'cancelled', createdAt: 1 }),
      job({ id: 'e', status: 'expired', createdAt: 5 }),
      job({ id: 'ttl', status: 'paused', expiresAt: now - 1, createdAt: 6 }),
    ];
    const part = partitionClientRequests({ jobs, clientId: 'c1', now });
    const ids = [...part.waiting, ...part.inProgress, ...part.closed, ...part.completed].map(
      (j) => j.id,
    );
    expect(new Set(ids).size).toBe(ids.length);
    expect(part.waiting.map((j) => j.id)).toEqual(['w']);
    expect(part.inProgress.map((j) => j.id)).toEqual(['p']);
    expect(part.completed.map((j) => j.id)).toEqual(['done']);
    expect(part.closed.map((j) => j.id).sort()).toEqual(['e', 'ttl', 'x'].sort());
  });
});
