/** Returned by AuthContext auth methods (never put secrets in `devRaw`). */
export type AuthFlowError = {
  code: 'unavailable' | 'auth_failed' | 'profile_failed';
  messageKey: string;
  vars?: Record<string, string | number>;
  /** Original server message — log in DEV only */
  devRaw?: string;
} | null;
