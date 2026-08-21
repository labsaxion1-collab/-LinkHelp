import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getTutorialInitialCardIdForLevel } from '@/gamification/config/gamificationTutorialContent';

const root = new URL('../../../', import.meta.url);

function read(rel: string): string {
  return readFileSync(new URL(rel, root), 'utf8');
}

describe('GamificationTutorialModal slide index', () => {
  it('seeds initial slide once per open and does not reset on cards rebuild while open', () => {
    const modal = read('src/gamification/components/GamificationTutorialModal.tsx');
    expect(modal).toContain('seededForOpenRef');
    expect(modal).toContain('seededForOpenRef.current = false');
    expect(modal).toContain('if (seededForOpenRef.current) return');
    expect(modal).toContain('goNext');
    expect(modal).toContain('goBack');
    expect(modal).toContain('onBackFromFirstStep');
    expect(modal).toContain('if (seededForOpenRef.current) return');
    expect(modal).toContain('}, [open, userType, initialCardId, cards]);');
  });

  it('maps helper level 2 (confiavel) to a tutorial card id used as open seed only', () => {
    expect(getTutorialInitialCardIdForLevel('helper', 'confiavel')).toBe('profissional');
    expect(getTutorialInitialCardIdForLevel('helper', 'profissional')).toBe('helper-profissional-elite');
    expect(getTutorialInitialCardIdForLevel('helper', 'novo')).toBe('helper-novo-iniciante');
  });

  it('does not call remote RPCs or mutate gamification while navigating slides', () => {
    const modal = read('src/gamification/components/GamificationTutorialModal.tsx');
    expect(modal).not.toContain('recalculate');
    expect(modal).not.toContain('commitGamification');
    expect(modal).not.toContain('fetch(');
    expect(modal).toContain('useGamification(userType)');
    expect(modal).toContain('setStep((prev) => prev + 1)');
    expect(modal).toContain('setStep((prev) => prev - 1)');
  });
});
