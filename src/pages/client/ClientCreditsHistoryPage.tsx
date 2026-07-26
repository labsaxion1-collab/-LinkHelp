import { useEffect, useState } from 'react';
import * as Icons from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { AppPageShell } from '@/components/design-system/AppPageShell';
import { ClientCreditHistoryList } from '@/components/client/ClientCreditHistoryList';
import { ClientCreditActivityDetailModal } from '@/components/client/ClientCreditActivityDetailModal';
import { ROUTES } from '@/utils/constants';
import { fetchClientCreditLedger } from '@/services/supabase/clientCreditLedgerRemote';
import type { ClientCreditLedgerEntry } from '@/types/clientCredits';
import { coerceLegacyLinkCreditsDisplay } from '@/utils/formatLinkCredits';

/**
 * Full LinkCredits history for clients — ledger only, no store chrome.
 */
export default function ClientCreditsHistoryPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { profile, authLoading, refreshProfile, session } = useAuth();
  const [ledgerLoading, setLedgerLoading] = useState(true);
  const [entries, setEntries] = useState<ClientCreditLedgerEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<ClientCreditLedgerEntry | null>(null);
  const [activityDetailOpen, setActivityDetailOpen] = useState(false);

  const balance =
    typeof profile?.credits === 'number' ? coerceLegacyLinkCreditsDisplay(profile.credits) : null;

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

  const sortedEntries = [...entries].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <AppPageShell wide className="relative min-w-0 overflow-x-hidden bg-[#F8FAFC] px-0 pb-28 pt-3 md:px-7 md:pb-10">
      <div className="relative mx-auto max-w-3xl px-4 sm:px-5">
        <header className="mb-3 flex items-start gap-3">
          <button
            type="button"
            onClick={() => navigate(ROUTES.clientCredits)}
            className="mt-0.5 inline-flex h-9 shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <Icons.ArrowLeft className="h-3.5 w-3.5" />
            {t('client_credits.back_to_summary')}
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-black tracking-tight text-slate-950 sm:text-lg">
              {t('client_credits.history_full_title')}
            </h1>
            <p className="mt-0.5 truncate text-[12px] font-semibold tabular-nums text-slate-500">
              {authLoading || balance == null
                ? '…'
                : t('client_credits.balance', { amount: balance })}
            </p>
          </div>
        </header>

        {ledgerLoading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm font-semibold text-slate-500">
            <Icons.Loader2 className="h-4 w-4 animate-spin" />
            …
          </div>
        ) : (
          <ClientCreditHistoryList
            entries={sortedEntries}
            limit={sortedEntries.length}
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
