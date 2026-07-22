import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveHeroDisplayPhase } from '@/gamification/utils/heroDisplayGate';

const clientDashboardSource = readFileSync(
  resolve(process.cwd(), 'src/pages/client/ClientDashboard.tsx'),
  'utf8',
);

const quickStripSource = readFileSync(
  resolve(process.cwd(), 'src/components/home/AppHomeClientQuickStrip.tsx'),
  'utf8',
);

const landingSource = readFileSync(resolve(process.cwd(), 'src/pages/LandingPage.tsx'), 'utf8');

describe('app home polish', () => {
  it('client dashboard mobile feed does not render institutional how-it-works block', () => {
    expect(clientDashboardSource).not.toContain("t('client_how_it_works.title')");
    expect(clientDashboardSource).not.toContain('activeHowItWorksStep');
  });

  it('client quick strip does not hardcode demo metrics', () => {
    expect(quickStripSource).not.toMatch(/value:\s*['"]0['"]/);
    expect(quickStripSource).toContain('String(activeJobsCount)');
  });

  it('landing page keeps institutional how-it-works content', () => {
    expect(landingSource).toContain('howItWorks');
  });

  it('hero display gate never shows resolved hero while loading', () => {
    expect(
      resolveHeroDisplayPhase({
        loading: true,
        error: false,
        record: { heroKey: 'client_novo' } as never,
      }),
    ).toBe('loading');
  });

  it('hero display gate shows error without default rank', () => {
    expect(
      resolveHeroDisplayPhase({
        loading: false,
        error: true,
        record: null,
      }),
    ).toBe('error');
  });
});
