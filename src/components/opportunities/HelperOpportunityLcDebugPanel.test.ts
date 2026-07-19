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

const sampleProps: HelperOpportunityLcDebugPanelProps = {
  jobId: 'job-cleaning-1',
  rawCategory: 'cleaning',
  resolvedCategoryId: 'cleaning',
  distanceKm: 8,
  interestCost: 4,
  serviceCost: 7,
  distanceCost: 1,
  estimatedTotal: 12,
  normalCharge: 12,
  vipCharge: 16,
  normalLabelCount: '12 LC',
  vipLabelCount: '16 LC',
};

function renderPanel(props: HelperOpportunityLcDebugPanelProps): string {
  return renderToStaticMarkup(createElement(HelperOpportunityLcDebugPanel, props));
}

describe('linkCreditsDebug', () => {
  it('is disabled without lcdebug=1', () => {
    expect(isLinkCreditsDebugEnabled('')).toBe(false);
    expect(isLinkCreditsDebugEnabled('?foo=1')).toBe(false);
    expect(isLinkCreditsDebugEnabled('?lcdebug=0')).toBe(false);
  });

  it('is enabled with lcdebug=1', () => {
    expect(isLinkCreditsDebugEnabled('?lcdebug=1')).toBe(true);
    expect(isLinkCreditsDebugEnabled(new URLSearchParams('lcdebug=1'))).toBe(true);
  });
});

describe('HelperOpportunityLcDebugPanel visibility', () => {
  it('panel absent without lcdebug=1', () => {
    expect(shouldShowHelperOpportunityLcDebugPanel(false, true)).toBe(false);
    expect(shouldShowHelperOpportunityLcDebugPanel(false, false)).toBe(false);

    const html = shouldShowHelperOpportunityLcDebugPanel(false, true)
      ? renderPanel(sampleProps)
      : '';
    expect(html).toBe('');
  });

  it('panel absent when description accordion is closed even with lcdebug=1', () => {
    expect(shouldShowHelperOpportunityLcDebugPanel(true, false)).toBe(false);
  });

  it('panel present with lcdebug=1 and open description', () => {
    expect(shouldShowHelperOpportunityLcDebugPanel(true, true)).toBe(true);

    const html = renderPanel(sampleProps);
    expect(html).toContain('DEBUG LC — TEMPORÁRIO');
    expect(html).toContain('helper-opportunity-lc-debug-panel');
    expect(html).toContain('job-cleaning-1');
  });

  it('displays runtime Normal and VIP values bound to visible labels', () => {
    const html = renderPanel(sampleProps);
    expect(html).toContain('normalCharge');
    expect(html).toContain('12');
    expect(html).toContain('vipCharge');
    expect(html).toContain('16');
    expect(html).toContain('UI Normal label (apply_cost_label count)');
    expect(html).toContain('12 LC');
    expect(html).toContain('UI VIP label (apply_cost_label count)');
    expect(html).toContain('16 LC');
    expect(html).toContain('estimatedTotal');
  });
});
