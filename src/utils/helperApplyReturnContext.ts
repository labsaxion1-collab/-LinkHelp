import type { HelperApplicationType } from '@/utils/helperOpportunityApply';

export const HELPER_APPLY_RETURN_STORAGE_KEY = 'linkhelp.helperApplyReturn';

export type HelperApplyReturnContext = {
  jobId: string;
  applicationType: HelperApplicationType;
  returnPath: string;
};

const memoryStore = new Map<string, string>();

function isApplyType(value: unknown): value is HelperApplicationType {
  return value === 'normal' || value === 'exclusive';
}

function writeStore(value: string | null): void {
  if (typeof sessionStorage !== 'undefined') {
    try {
      if (value == null) sessionStorage.removeItem(HELPER_APPLY_RETURN_STORAGE_KEY);
      else sessionStorage.setItem(HELPER_APPLY_RETURN_STORAGE_KEY, value);
      return;
    } catch {
      // fall through to memory
    }
  }
  if (value == null) memoryStore.delete(HELPER_APPLY_RETURN_STORAGE_KEY);
  else memoryStore.set(HELPER_APPLY_RETURN_STORAGE_KEY, value);
}

function readStore(): string | null {
  if (typeof sessionStorage !== 'undefined') {
    try {
      return sessionStorage.getItem(HELPER_APPLY_RETURN_STORAGE_KEY);
    } catch {
      // fall through to memory
    }
  }
  return memoryStore.get(HELPER_APPLY_RETURN_STORAGE_KEY) ?? null;
}

export function storeHelperApplyReturnContext(ctx: HelperApplyReturnContext): void {
  writeStore(JSON.stringify(ctx));
}

export function peekHelperApplyReturnContext(): HelperApplyReturnContext | null {
  const raw = readStore();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<HelperApplyReturnContext>;
    if (!parsed.jobId?.trim() || !isApplyType(parsed.applicationType) || !parsed.returnPath?.trim()) {
      return null;
    }
    return {
      jobId: parsed.jobId,
      applicationType: parsed.applicationType,
      returnPath: parsed.returnPath,
    };
  } catch {
    return null;
  }
}

export function consumeHelperApplyReturnContext(): HelperApplyReturnContext | null {
  const ctx = peekHelperApplyReturnContext();
  writeStore(null);
  return ctx;
}

export function clearHelperApplyReturnContext(): void {
  writeStore(null);
}
