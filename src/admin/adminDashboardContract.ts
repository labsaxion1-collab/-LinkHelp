import type { AdminDashboardFinancialSummary } from './adminDashboardFinancialContract';

export type AdminDashboardCategorySummary = {
  category: string;
  openRequests: number;
  applications: number;
  hiredApplications: number;
  hireRate: number;
  averageBudget: number | null;
};

export type AdminDashboardSummary = {
  totalRequests: number;
  openRequests: number;
  inProgressRequests: number;
  totalApplications: number;
  pendingApplications: number;
  hiredApplications: number;
  hireRate: number;
  categories: AdminDashboardCategorySummary[];
};

export type AdminDashboardPayload = {
  summary: AdminDashboardSummary;
  financial: AdminDashboardFinancialSummary | null;
  financialError: string | null;
};

function finiteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function nonNegative(value: unknown): number | null {
  const parsed = finiteNumber(value);
  return parsed != null && parsed >= 0 ? parsed : null;
}

function parseCategoriesField(value: unknown): unknown[] | null {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

export function parseAdminDashboardSummary(value: unknown): AdminDashboardSummary | null {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== 'object') return null;
  const raw = row as Record<string, unknown>;
  const totalRequests = nonNegative(raw.total_requests);
  const openRequests = nonNegative(raw.open_requests);
  const inProgressRequests = nonNegative(raw.in_progress_requests);
  const totalApplications = nonNegative(raw.total_applications);
  const pendingApplications = nonNegative(raw.pending_applications);
  const hiredApplications = nonNegative(raw.hired_applications);
  const hireRate = nonNegative(raw.hire_rate);
  if (
    [totalRequests, openRequests, inProgressRequests, totalApplications, pendingApplications, hiredApplications, hireRate].some(
      (entry) => entry == null,
    )
  ) {
    return null;
  }

  const categoriesRaw = parseCategoriesField(raw.categories);
  if (categoriesRaw == null) return null;

  const categories: AdminDashboardCategorySummary[] = [];
  for (const entry of categoriesRaw) {
    if (!entry || typeof entry !== 'object') return null;
    const category = entry as Record<string, unknown>;
    const open = nonNegative(category.open_requests);
    const applications = nonNegative(category.applications);
    const hired = nonNegative(category.hired_applications);
    const rate = nonNegative(category.hire_rate);
    const average = category.average_budget == null ? null : nonNegative(category.average_budget);
    if (
      typeof category.category !== 'string' ||
      !category.category ||
      open == null ||
      applications == null ||
      hired == null ||
      rate == null ||
      (category.average_budget != null && average == null)
    ) {
      return null;
    }
    categories.push({
      category: category.category,
      openRequests: open,
      applications,
      hiredApplications: hired,
      hireRate: rate,
      averageBudget: average,
    });
  }

  return {
    totalRequests: totalRequests!,
    openRequests: openRequests!,
    inProgressRequests: inProgressRequests!,
    totalApplications: totalApplications!,
    pendingApplications: pendingApplications!,
    hiredApplications: hiredApplications!,
    hireRate: hireRate!,
    categories,
  };
}

export function isAdminDashboardEmpty(summary: AdminDashboardSummary): boolean {
  return (
    summary.totalRequests === 0 &&
    summary.totalApplications === 0 &&
    summary.categories.length === 0
  );
}
