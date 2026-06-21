const STORAGE_PREFIX = 'lh:client-onboarding-tutorial:';

export function hasSeenClientTutorial(userId: string): boolean {
  if (!userId) return true;
  try {
    return localStorage.getItem(`${STORAGE_PREFIX}${userId}`) === '1';
  } catch {
    return false;
  }
}

export function markClientTutorialSeen(userId: string): void {
  if (!userId) return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${userId}`, '1');
  } catch {
    /* ignore */
  }
}
