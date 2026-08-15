import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isTutorialSwipeIgnoredTarget } from '@/hooks/useTutorialSwipe';

const root = (...parts: string[]) => resolve(process.cwd(), ...parts);

describe('client onboarding tour — last-step controls', () => {
  it('X, Pular, Voltar, criar pedido and explorar exist on the final step', async () => {
    const carousel = await readFile(root('src/components/client/onboarding/ClientOnboardingCarousel.tsx'), 'utf8');
    expect(carousel).toContain("onDismiss={handleSkip}");
    expect(carousel).toContain("onSkip={handleSkip}");
    expect(carousel).toContain("handleComplete('createRequest')");
    expect(carousel).toContain("handleComplete('explore')");
    expect(carousel).toMatch(/isLast \? \([\s\S]*cta_create_request[\s\S]*cta_explore[\s\S]*cta_back/);
  });

  it('skip and close keep the existing complete(explore) rule', async () => {
    const carousel = await readFile(root('src/components/client/onboarding/ClientOnboardingCarousel.tsx'), 'utf8');
    expect(carousel).toContain("void onComplete('explore')");
    expect(carousel).toContain('if (completing) return');
  });

  it('chrome and footer sit above the swipe/celebration layer', async () => {
    const card = await readFile(root('src/components/tutorial/TutorialCenterCard.tsx'), 'utf8');
    expect(card).toContain("immersiveLayout ? 'absolute inset-0 z-0'");
    expect(card).toContain("z-[60]");
    expect(card).toContain("pointer-events-auto absolute inset-x-0 bottom-0 z-[60]");
    expect(card).not.toContain("pointer-events-none absolute inset-x-0 bottom-0 z-30");
    expect(card).toContain('min-h-11 min-w-11');
  });

  it('confetti and celebration overlays do not intercept pointer events', async () => {
    const effects = await readFile(root('src/components/tutorial/TutorialCelebrationEffects.tsx'), 'utf8');
    expect(effects).toContain('pointer-events-none absolute inset-0 z-[15]');
    expect(effects).toContain('lh-tutorial-confetti-particle pointer-events-none');
    expect(effects).toContain('lh-tutorial-glitter-particle pointer-events-none');
    expect(effects).toContain('lh-tutorial-gift-bounce pointer-events-none');
    const hero = await readFile(root('src/components/tutorial/TutorialImmersiveHero.tsx'), 'utf8');
    expect(hero).toContain('pointer-events-none absolute inset-x-0 z-20 px-6');
  });

  it('swipe ignores clicks and touches on buttons', async () => {
    const swipe = await readFile(root('src/hooks/useTutorialSwipe.ts'), 'utf8');
    expect(swipe).toContain('export function isTutorialSwipeIgnoredTarget');
    expect(swipe).toContain("closest('button, a, input, textarea, select, [role=\"button\"]')");
    expect(swipe).toContain('isTutorialSwipeIgnoredTarget(event.target)');
    expect(isTutorialSwipeIgnoredTarget(null)).toBe(false);
  });

  it('completion uses an in-flight guard, finally, and does not wait on profile refresh to unfreeze', async () => {
    const hook = await readFile(root('src/hooks/useClientOnboarding.ts'), 'utf8');
    expect(hook).toContain('inFlightRef.current');
    expect(hook).toContain('setCompleting(false)');
    expect(hook).toContain('setLocalCompleted(true)');
    expect(hook).toMatch(/try \{\s*await refreshProfile\(\);/);
    expect(hook).toContain('} finally {');
    const dashboard = await readFile(root('src/pages/client/ClientDashboard.tsx'), 'utf8');
    expect(dashboard).toContain('if (!result) return');
    expect(dashboard).toContain("extractErrorMessage(error), 'error'");
  });

  it('welcome reward stays a single RPC complete_client_onboarding path', async () => {
    const remote = await readFile(root('src/services/supabase/clientOnboardingRemote.ts'), 'utf8');
    expect(remote).toContain("rpc('complete_client_onboarding'");
    const hook = await readFile(root('src/hooks/useClientOnboarding.ts'), 'utf8');
    expect(hook).toContain('remoteCompleteClientOnboarding(profile.id');
    expect(hook).not.toContain('grantUserReward');
  });
});
