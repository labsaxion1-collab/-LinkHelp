import type { HelperSubscriptionTier } from '@/types/helperSubscription';
import { mockUsers } from '@/data/mockUsers';
import type { Application } from '@/types/application';

export function helperPlanFromRoleKey(roleKey: string): HelperSubscriptionTier {
  if (roleKey === 'pro_helper') return 'PRO_HELP';
  if (roleKey === 'elite') return 'ELITE';
  if (roleKey === 'trusted') return 'BASIC';
  return 'BASIC';
}

export function helperTierFromApplication(app: Application): HelperSubscriptionTier {
  if (app.helperId === mockUsers.helper.id) return mockUsers.helper.subscriptionTier ?? 'BASIC';
  if (app.helperPlan) return app.helperPlan;
  return 'BASIC';
}
