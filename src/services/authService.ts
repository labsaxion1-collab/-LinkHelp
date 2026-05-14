/** Placeholder — wire to your auth backend */
export async function signOutDemo(): Promise<void> {
  await Promise.resolve();
}

export function getStoredSessionToken(): string | null {
  return localStorage.getItem('linkhelp_session_demo');
}
