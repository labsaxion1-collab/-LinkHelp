import { useAuth } from '@/context/AuthContext';
import { useAppMode } from '@/context/AppModeContext';
import { avatarUrlForName } from '@/utils/avatarUrl';
import type { HelperSubscriptionTier } from '@/types/helperSubscription';

export type SessionViewer = {
  id: string;
  name: string;
  avatar: string;
  userType: 'client' | 'helper';
  subscriptionTier: HelperSubscriptionTier;
  rating: number;
  jobsCompleted: number;
  nextBillingDate?: string;
};

const guestAvatar = (label: string) => avatarUrlForName(label, 'dbeafe', '1e3a8a');

/**
 * Current user for shell UI. With Supabase configured, uses `profiles` / `session` only (no mock users).
 */
export function useSessionViewer(): SessionViewer {
  const { profile, session, isConfigured, authLoading } = useAuth();
  const { mode } = useAppMode();

  if (isConfigured && session?.user) {
    const meta = (session.user.user_metadata ?? {}) as Record<string, unknown>;
    const metaStr = (k: string) => (typeof meta[k] === 'string' ? (meta[k] as string) : '');
    const fallbackName = metaStr('full_name') || metaStr('name') || session.user.email?.split('@')[0] || 'User';
    const name = profile?.name?.trim() || fallbackName;
    const pic = profile?.avatar_url?.trim() || metaStr('avatar_url') || metaStr('picture');
    const avatar = pic || guestAvatar(name);
    const userType: 'client' | 'helper' = profile?.role === 'helper' ? 'helper' : mode;
    return {
      id: profile?.id ?? session.user.id,
      name,
      avatar,
      userType,
      subscriptionTier: 'BASIC',
      rating: profile?.rating ?? 4.8,
      jobsCompleted: 0,
      nextBillingDate: undefined,
    };
  }

  if (isConfigured && authLoading) {
    return {
      id: '…',
      name: '…',
      avatar: guestAvatar('LinkHelp'),
      userType: mode,
      subscriptionTier: 'BASIC',
      rating: 0,
      jobsCompleted: 0,
    };
  }

  return {
    id: 'guest',
    name: 'Guest',
    avatar: guestAvatar('Guest'),
    userType: mode,
    subscriptionTier: 'BASIC',
    rating: 0,
    jobsCompleted: 0,
  };
}
