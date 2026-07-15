import { describe, expect, it } from 'vitest';
import { parseAdminDashboardSummary } from './adminDashboardContract';

const valid = {
  total_requests: 4,
  open_requests: 2,
  in_progress_requests: 1,
  total_applications: 5,
  pending_applications: 2,
  hired_applications: 2,
  hire_rate: 40,
  categories: [{ category: 'cleaning', open_requests: 2, applications: 5, hired_applications: 2, hire_rate: 40, average_budget: 125.5 }],
};

describe('admin dashboard contract', () => {
  it('maps the aggregate RPC row without exposing raw fields', () => {
    expect(parseAdminDashboardSummary([valid])).toEqual({
      totalRequests: 4,
      openRequests: 2,
      inProgressRequests: 1,
      totalApplications: 5,
      pendingApplications: 2,
      hiredApplications: 2,
      hireRate: 40,
      categories: [{ category: 'cleaning', openRequests: 2, applications: 5, hiredApplications: 2, hireRate: 40, averageBudget: 125.5 }],
    });
  });

  it('accepts empty tables and null category budget', () => {
    expect(parseAdminDashboardSummary([{ ...valid, total_requests: 0, total_applications: 0, hire_rate: 0, categories: [{ ...valid.categories[0], average_budget: null }] }])?.hireRate).toBe(0);
  });

  it('rejects malformed or personal payloads instead of casting blindly', () => {
    expect(parseAdminDashboardSummary({ ...valid, total_requests: -1 })).toBeNull();
    expect(parseAdminDashboardSummary({ ...valid, categories: [{ ...valid.categories[0], category: '' }] })).toBeNull();
    expect(parseAdminDashboardSummary({ email: 'private@example.com' })).toBeNull();
  });
});
