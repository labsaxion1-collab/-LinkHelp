import type { MockUserBundle } from '@/types/user';
import { avatarUrlForName } from '@/utils/avatarUrl';

export const mockUsers: MockUserBundle = {
  client: {
    id: 'user_1',
    name: 'Sophie Martin',
    role: 'client',
    avatar: avatarUrlForName('Sophie Martin', 'dbeafe', '1e3a8a'),
    location: 'Montreal, QC',
    subscriptionTier: 'BASIC',
  },
  helper: {
    id: 'user_2',
    name: 'Lucas Silva',
    role: 'helper',
    avatar: avatarUrlForName('Lucas Silva', 'dcfce7', '14532d'),
    location: 'Toronto, ON',
    rating: 4.8,
    jobsCompleted: 42,
    subscriptionTier: 'ELITE',
    nextBillingDate: '2026-06-14',
  },
};
