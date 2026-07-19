import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  HelperOpportunityLcDebugPanel,
  type HelperOpportunityLcDebugPanelProps,
} from '@/components/opportunities/HelperOpportunityLcDebugPanel';
import {
  isLinkCreditsDebugEnabled,
  shouldShowHelperOpportunityLcDebugPanel,
} from '@/utils/linkCreditsDebug';
import { getHelperLeadCreditQuoteFromBreakdown } from '@/utils/helperLeadCreditQuote';
import { calculateHelperLeadCreditCost } from '@/utils/calculateHelperLeadCreditCost';

const breakdown = calculateHelperLeadCreditCost(
  {
    id: 'job-cleaning-1',
    clientId: 'c1',
    clientName: 'Client',
    clientAvatar: '',
    title: 'Clean',
    category: 'cleaning',
    description: 'Need help',
    date: 'Today',
    location: 'Montreal',
    value: 'CAD $80',
    urgency: 'normal',
    status: 'open',
    createdAt: Date.now(),
  },
  { distanceKm: 8 },
);
const creditQuote = getHelperLeadCreditQuoteFromBreakdown(breakdown);

const sampleProps: HelperOpportunityLcDebugPanelProps = {
  jobId: 'job-cleaning-1',
  rawCategory: 'cleaning',
  resolvedCategoryId: 'cleaning',
  distanceKm: 8,
  creditQuote,
  walletBalance: 50,
  normalLabelCount: '4 LC',
  vipLabelCount: `${creditQuote.vipApplyLc} LC`,
};

function renderPanel(props: HelperOpportunityLcDebugPanelProps): string {
  return renderToStaticMarkup(createElement(HelperOpportunityLcDebugPanel, props));
}

describe('linkCreditsDebug', () => {
  it('is disabled without lcdebug=1', () => {
    expect(isLinkCreditsDebugEnabled('')).toBe(false);
    expect(isLinkCreditsDebugEnabled('?lcdebug=0')).toBe(false);
  });

  it('is enabled with lcdebug=1', () => {
    expect(isLinkCreditsDebugEnabled('?lcdebug=1')).toBe(true);
  });
});

describe('HelperOpportunityLcDebugPanel', () => {
  it('panel present with lcdebug=1 and open description', () => {
    expect(shouldShowHelperOpportunityLcDebugPanel(true, true)).toBe(true);
    const html = renderPanel(sampleProps);
    expect(html).toContain('DEBUG LC — TEMPORÁRIO');
    expect(html).toContain('fullRequestLc');
    expect(html).toContain('normalApplyLc');
    expect(html).toContain('normalHireRemainderLc');
    expect(html).toContain('vipApplyLc');
    expect(html).toContain('balanceAfterNormalApply');
    expect(html).toContain('balanceAfterVipApply');
  });
});
