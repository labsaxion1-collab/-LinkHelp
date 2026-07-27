import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { useCredits } from '@/context/CreditContext';
import { ClientCreditHistoryList } from '@/components/client/ClientCreditHistoryList';
import { ClientCreditActivityDetailModal } from '@/components/client/ClientCreditActivityDetailModal';
import { CreditTransactionHistoryList } from '@/components/credits/CreditTransactionHistoryList';
import { ProfileSectionHeader } from '@/components/profile/ProfileSectionHeader';
import {
  fetchClientCreditLedger,
  startOfCurrentMonthIso,
} from '@/services/supabase/clientCreditLedgerRemote';
import { computeClientCreditMetrics } from '@/utils/clientCreditMetrics';
import type { ClientCreditLedgerEntry } from '@/types/clientCredits';
import { ROUTES } from '@/utils/constants';
import { linkCreditsHistoryState } from '@/utils/linkCreditsHistoryNav';

type Role = 'client' | 'helper';

type Props = {
  role: Role;
  onMonthMetrics?: (usedThisMonth: number) => void;
};

export function ProfileRecentActivity({ role, onMonthMetrics }: Props) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { transactions, unlocks, loading: helperLoading } = useCredits();
  const [ledgerLoading, setLedgerLoading] = useState(role === 'client');
  const [recentEntries, setRecentEntries] = useState<ClientCreditLedgerEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<ClientCreditLedgerEntry | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    if (role !== 'client') return;
    let cancelled = false;

    const load = async () => {
      setLedgerLoading(true);
      try {
        const monthStart = startOfCurrentMonthIso();
        const [recent, month] = await Promise.all([
          fetchClientCreditLedger({ limit: 5 }),
          fetchClientCreditLedger({ since: monthStart, limit: 500 }),
        ]);
        if (cancelled) return;
        setRecentEntries(recent);
        onMonthMetrics?.(computeClientCreditMetrics(month).usedThisMonth);
      } finally {
        if (!cancelled) setLedgerLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [role, onMonthMetrics]);

  const historyRoute = role === 'client' ? ROUTES.clientCreditsHistory : ROUTES.helperCreditsHistory;

  return (
    <section>
      <ProfileSectionHeader
        title={t('profile_page.section_activity')}
        action={
          <button
            type="button"
            onClick={() => navigate(historyRoute, { state: linkCreditsHistoryState('profile') })}
            className="text-sm font-bold text-[#2563FF] transition hover:text-[#1D4ED8]"
          >
            {t('profile_page.view_all')}
          </button>
        }
      />
      <div className="rounded-[1.5rem] border border-slate-200/90 bg-white p-3.5 shadow-[0_12px_32px_rgba(15,23,42,0.045)] sm:p-4">
        {role === 'client' ? (
          ledgerLoading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm font-semibold text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              {t('common.loading')}
            </div>
          ) : (
            <ClientCreditHistoryList
              entries={recentEntries}
              limit={4}
              t={t}
              emptyLabel={t('client_credits.no_history')}
              onSelect={(entry) => {
                if (!entry.requestId) return;
                setSelectedEntry(entry);
                setDetailOpen(true);
              }}
            />
          )
        ) : helperLoading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm font-semibold text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {t('common.loading')}
          </div>
        ) : (
          <CreditTransactionHistoryList
            transactions={transactions}
            unlocks={unlocks}
            limit={4}
            variant="light"
            t={t}
            emptyLabel={t('credits.history_empty')}
            balanceAfterLabel={(count) => t('credits.balance_after', { count })}
            onSelect={() =>
              navigate(ROUTES.helperCreditsHistory, { state: linkCreditsHistoryState('profile') })
            }
          />
        )}
      </div>

      {role === 'client' ? (
        <ClientCreditActivityDetailModal
          entry={selectedEntry}
          open={detailOpen}
          onClose={() => {
            setDetailOpen(false);
            setSelectedEntry(null);
          }}
          t={t}
          onRequestNotFound={() => showToast(t('client_credits.request_not_found'), 'error')}
        />
      ) : null}
    </section>
  );
}
