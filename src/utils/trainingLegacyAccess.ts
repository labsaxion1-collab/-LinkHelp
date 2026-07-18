import { lessonsAccessibleForTier } from '@/data/helperTrainingCatalog';
import {
  TRAINING_RUNTIME_ACCESS_TIER,
  type LegacyHelperTierKey,
} from '@/types/helperSubscription';

/** Active training gate tier — not tied to session or billing. */
export function trainingRuntimeAccessTier(): LegacyHelperTierKey {
  return TRAINING_RUNTIME_ACCESS_TIER;
}

export function lessonsAccessibleAtRuntime(
  tier: LegacyHelperTierKey = TRAINING_RUNTIME_ACCESS_TIER,
) {
  return lessonsAccessibleForTier(tier);
}
