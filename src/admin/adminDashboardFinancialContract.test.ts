import { describe, expect, it } from 'vitest';
import { parseAdminDashboardFinancialSummary } from './adminDashboardFinancialContract';

const valid = {
  revenue_cad_cents: 4999,
  purchase_count: 2,
  lc_sold: 120,
  lc_consumed: 45,
  lc_refunded: 10,
  lc_granted: 30,
  lc_in_circulation: 500,
  net_credit_burn: 35,
  time_range: '7d',
};

describe('admin dashboard financial contract', () => {
  it('maps the financial RPC row', () => {
    expect(parseAdminDashboardFinancialSummary([valid], 'all')).toEqual({
      revenueCadCents: 4999,
      purchaseCount: 2,
      lcSold: 120,
      lcConsumed: 45,
      lcRefunded: 10,
      lcGranted: 30,
      lcInCirculation: 500,
      netCreditBurn: 35,
      timeRange: '7d',
    });
  });

  it('accepts zero values after a platform reset', () => {
    const zeros = {
      revenue_cad_cents: 0,
      purchase_count: 0,
      lc_sold: 0,
      lc_consumed: 0,
      lc_refunded: 0,
      lc_granted: 0,
      lc_in_circulation: 0,
      net_credit_burn: 0,
      time_range: 'all',
    };
    expect(parseAdminDashboardFinancialSummary([zeros])).toEqual({
      revenueCadCents: 0,
      purchaseCount: 0,
      lcSold: 0,
      lcConsumed: 0,
      lcRefunded: 0,
      lcGranted: 0,
      lcInCirculation: 0,
      netCreditBurn: 0,
      timeRange: 'all',
    });
  });

  it('rejects malformed payloads', () => {
    expect(parseAdminDashboardFinancialSummary({ revenue_cad_cents: -1 })).toBeNull();
    expect(parseAdminDashboardFinancialSummary(null)).toBeNull();
  });
});
