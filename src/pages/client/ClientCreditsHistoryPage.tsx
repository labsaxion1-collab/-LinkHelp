import { useEffect, useMemo, useState } from 'react';
import * as Icons from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { AppPageShell } from '@/components/design-system/AppPageShell';
import { ClientCreditHistoryList } from '@/components/client/ClientCreditHistoryList';
import { ClientCreditActivityDetailModal } from '@/components/client/ClientCreditActivityDetailModal';
import { LinkCreditsHistoryFilterBar } from '@/components/credits/LinkCreditsHistoryFilterBar';
import { LinkCreditsHistorySummary } from '@/components/credits/LinkCreditsHistorySummary';
import { fetchClientCreditLedger } from '@/services/supabase/clientCreditLedgerRemote';
import type { ClientCreditLedgerEntry } from '@/types/clientCredits';
import { coerceLegacyLinkCreditsDisplay } from '@/utils/formatLinkCredits';
import {
  LINK_CREDITS_HISTORY_FROM_KEY,
  parseLinkCreditsHistoryFrom,
  resolveLinkCreditsHistoryBackPath,
  type LinkCreditsHistoryLocationState,
} from '@/utils/linkCreditsHistoryNav';
import {
  computeLinkCreditsHistoryTotals,
  filterLinkCreditsHistoryAmounts,
  type LinkCreditsHistoryFilter,
} from '@/utils/linkCreditsHistoryTotals';

/**
 * Full LinkCredits history for clients — ledger only, no store chrome.
 */
export default function ClientCreditsHistoryPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const { profile, authLoading, refreshProfile, session } = useAuth();
  const [ledgerLoading, setLedgerLoading] = useState(true);
  const [entries, setEntries] = useState<ClientCreditLedgerEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<ClientCreditLedgerEntry | null>(null);
  const [activityDetailOpen, setActivityDetailOpen] = useState(false);
  const [filter, setFilter] = useState<LinkCreditsHistoryFilter>('all');

  const balance =
    typeof profile?.credits === 'number' ? coerceLegacyLinkCreditsDisplay(profile.credits) : null;
  const lcUnit = t('credits.lc_unit');

  const from = parseLinkCreditsHistoryFrom(
    (location.state as LinkCreditsHistoryLocationState | null)?.[LINK_CREDITS_HISTORY_FROM_KEY],
  );
  const backPath = resolveLinkCreditsHistoryBackPath('client', from);

  useEffect(() => {
    let cancelledEffect = false;

    const load = async () => {
      setLedgerLoading(true);
      try {
        await refreshProfile();
        const recent = await fetchClientCreditLedger({ limit: 100 });
        if (!cancelledEffect) setEntries(recent);
      } finally {
        if (!cancelledEffect) setLedgerLoading(false);
      }
    };

    void load();
    return () => {
      cancelledEffect = true;
    };
  }, [refreshProfile, session?.user?.id, profile?.id]);

  const sortedEntries = useMemo(
    () =>
      [...entries].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [entries],
  );

  const totals = useMemo(
    () => computeLinkCreditsHistoryTotals(sortedEntries.map((e) => e.amount)),
    [sortedEntries],
  );

  const filteredEntries = useMemo(
    () => filterLinkCreditsHistoryAmounts(sortedEntries, filter, (e) => e.amount),
    [sortedEntries, filter],
  );

  return (
    <AppPageShell wide className="relative min-w-0 overflow-x-hidden bg-[#F8FAFC] px-0 pb-28 pt-3 md:px-7 md:pb-10">
      <div className="relative mx-auto max-w-3xl space-y-3 px-4 sm:px-5">
        <header className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => navigate(backPath)}
            className="mt-0.5 inline-flex h-9 shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <Icons.ArrowLeft className="h-3.5 w-3.5" />
            {t('client_credits.back_to_summary')}
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-black leading-snug tracking-tight text-slate-950 sm:truncate sm:text-lg">
              {t('client_credits.history_full_title')}
            </h1>
            <p className="mt-0.5 truncate text-[12px] font-semibold tabular-nums text-slate-500">
              {authLoading || balance == null
                ? '…'
                : t('client_credits.balance', { amount: balance })}
            </p>
          </div>
        </header>

        <LinkCreditsHistorySummary
          variant="light"
          totalReceived={totals.totalReceived}
          totalUsed={totals.totalUsed}
          balance={balance}
          loading={ledgerLoading || authLoading}
          lcUnit={lcUnit}
          labels={{
            received: t('credits.history_total_received'),
            used: t('credits.history_total_used'),
            balance: t('credits.history_balance_now'),
          }}
        />

        <LinkCreditsHistoryFilterBar
          variant="light"
          filter={filter}
          onChange={setFilter}
          labels={{
            all: t('credits.history_filter_all'),
            inbound: t('credits.history_filter_in'),
            outbound: t('credits.history_filter_out'),
          }}
        />

        {ledgerLoading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm font-semibold text-slate-500">
            <Icons.Loader2 className="h-4 w-4 animate-spin" />
            …
          </div>
        ) : (
          <ClientCreditHistoryList
            entries={filteredEntries}
            limit={filteredEntries.length}
            density="compact"
            t={t}
            emptyLabel={t('client_credits.no_history')}
            onSelect={(entry) => {
              if (!entry.requestId) return;
              setSelectedEntry(entry);
              setActivityDetailOpen(true);
            }}
          />
        )}
      </div>

      <ClientCreditActivityDetailModal
        entry={selectedEntry}
        open={activityDetailOpen}
        onClose={() => {
          setActivityDetailOpen(false);
          setSelectedEntry(null);
        }}
        onRequestNotFound={() => showToast(t('client_credits.request_not_found'), 'error')}
        t={t}
      />
    </AppPageShell>
  );
}
