import type { Application } from '@/types/application';

/** Chat is available only after the client officially hires the helper. */
export function isChatUnlockedApplication(app: Application): boolean {
  return app.status === 'accepted' && Boolean(app.chatUnlocked);
}

export function isClientChatUnlockedForHelper(
  helperId: string,
  clientJobIds: string[],
  applications: Application[],
): boolean {
  return applications.some(
    (a) =>
      a.helperId === helperId &&
      clientJobIds.includes(a.jobId) &&
      isChatUnlockedApplication(a),
  );
}

export function findClientHelperApplication(
  helperId: string,
  clientJobIds: string[],
  applications: Application[],
): Application | undefined {
  return applications
    .filter(
      (a) =>
        a.helperId === helperId &&
        clientJobIds.includes(a.jobId) &&
        a.status !== 'cancelled' &&
        a.status !== 'rejected',
    )
    .sort((a, b) => b.createdAt - a.createdAt)[0];
}
