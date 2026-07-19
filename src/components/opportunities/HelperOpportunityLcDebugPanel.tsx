import { ENABLE_FULL_HELPER_CREDIT_CHARGE } from '@/config/helperCreditCharge';
import type { HelperLeadCreditQuote } from '@/utils/helperLeadCreditQuote';

export type HelperOpportunityLcDebugPanelProps = {
  jobId: string;
  rawCategory: string;
  resolvedCategoryId: string;
  distanceKm: number | null | undefined;
  creditQuote: HelperLeadCreditQuote;
  walletBalance: number | null;
  normalLabelCount: string;
  vipLabelCount: string;
};

export function HelperOpportunityLcDebugPanel({
  jobId,
  rawCategory,
  resolvedCategoryId,
  distanceKm,
  creditQuote,
  walletBalance,
  normalLabelCount,
  vipLabelCount,
}: HelperOpportunityLcDebugPanelProps) {
  const distanceDisplay =
    distanceKm == null ? 'null' : Number.isFinite(distanceKm) ? String(distanceKm) : String(distanceKm);

  const balanceAfterNormal =
    walletBalance == null ? 'n/a' : String(Math.max(0, walletBalance - creditQuote.normalApplyLc));
  const balanceAfterVip =
    walletBalance == null ? 'n/a' : String(Math.max(0, walletBalance - creditQuote.vipApplyLc));

  const rows: { label: string; value: string }[] = [
    { label: 'job.id', value: jobId },
    { label: 'raw job.category', value: rawCategory },
    { label: 'resolved categoryId', value: resolvedCategoryId },
    { label: 'distanceKm', value: distanceDisplay },
    { label: 'fullRequestLc', value: String(creditQuote.fullRequestLc) },
    { label: 'normalApplyLc', value: String(creditQuote.normalApplyLc) },
    { label: 'normalHireRemainderLc', value: String(creditQuote.normalHireRemainderLc) },
    { label: 'vipApplyLc', value: String(creditQuote.vipApplyLc) },
    { label: 'serviceLc', value: String(creditQuote.serviceLc) },
    { label: 'distanceLc', value: String(creditQuote.distanceLc) },
    { label: 'walletBalance', value: walletBalance == null ? 'null' : String(walletBalance) },
    { label: 'balanceAfterNormalApply', value: balanceAfterNormal },
    { label: 'balanceAfterVipApply', value: balanceAfterVip },
    { label: 'ENABLE_FULL_HELPER_CREDIT_CHARGE', value: String(ENABLE_FULL_HELPER_CREDIT_CHARGE) },
    { label: 'UI Normal label (apply_cost_label count)', value: normalLabelCount },
    { label: 'UI VIP label (apply_cost_label count)', value: vipLabelCount },
  ];

  return (
    <div
      className="rounded-lg border border-dashed border-violet-400/80 bg-violet-50/90 px-2.5 py-2 font-mono text-[10px] leading-relaxed text-violet-950"
      data-testid="helper-opportunity-lc-debug-panel"
    >
      <p className="mb-1.5 text-[11px] font-black uppercase tracking-wide text-violet-800">
        DEBUG LC — TEMPORÁRIO
      </p>
      <dl className="space-y-0.5">
        {rows.map(({ label, value }) => (
          <div key={label} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 gap-y-0">
            <dt className="truncate font-semibold text-violet-800/90">{label}</dt>
            <dd className="shrink-0 text-right font-bold text-violet-950">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
