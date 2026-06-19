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

/** Prefer explicit application / open request context over the most recent application. */
export function resolveClientHelperApplication(
  helperId: string,
  clientJobIds: string[],
  applications: Application[],
  options?: { applicationId?: string | null; requestId?: string | null },
): Application | undefined {
  const isActive = (a: Application) =>
    a.helperId === helperId &&
    clientJobIds.includes(a.jobId) &&
    a.status !== 'cancelled' &&
    a.status !== 'rejected';

  if (options?.applicationId) {
    const byId = applications.find((a) => a.id === options.applicationId);
    if (byId && isActive(byId)) return byId;
  }

  if (options?.requestId) {
    const onRequest = applications.find((a) => a.jobId === options.requestId && isActive(a));
    if (onRequest) return onRequest;
  }

  return findClientHelperApplication(helperId, clientJobIds, applications);
}
