import { useLanguage } from '@/context/LanguageContext';
import { clsx } from 'clsx';

export type HelperPresenceStatus = 'available' | 'busy' | 'working' | 'offline';
export type ClientPresenceStatus = 'seeking' | 'waiting' | 'in_progress';

type Props =
  | { role: 'helper'; status?: HelperPresenceStatus }
  | { role: 'client'; status?: ClientPresenceStatus };

const helperKey: Record<HelperPresenceStatus, string> = {
  available: 'presence.helper_available',
  busy: 'presence.helper_busy',
  working: 'presence.helper_working',
  offline: 'presence.helper_offline',
};

const clientKey: Record<ClientPresenceStatus, string> = {
  seeking: 'presence.client_seeking',
  waiting: 'presence.client_waiting',
  in_progress: 'presence.client_in_progress',
};

const helperDot: Record<HelperPresenceStatus, string> = {
  available: 'bg-emerald-500',
  busy: 'bg-amber-500',
  working: 'bg-sky-500',
  offline: 'bg-slate-400',
};

const clientDot: Record<ClientPresenceStatus, string> = {
  seeking: 'bg-sky-500',
  waiting: 'bg-amber-500',
  in_progress: 'bg-violet-500',
};

const helperSkin: Record<HelperPresenceStatus, string> = {
  available: 'border-emerald-200/90 bg-emerald-50/90 text-emerald-900',
  busy: 'border-amber-200/90 bg-amber-50/90 text-amber-950',
  working: 'border-sky-200/90 bg-sky-50/90 text-sky-950',
  offline: 'border-slate-200/90 bg-slate-100/90 text-slate-700',
};

const clientSkin: Record<ClientPresenceStatus, string> = {
  seeking: 'border-sky-200/90 bg-sky-50/90 text-sky-900',
  waiting: 'border-amber-200/90 bg-amber-50/90 text-amber-950',
  in_progress: 'border-violet-200/90 bg-violet-50/90 text-violet-950',
};

/**
 * Discrete status chip for dashboards (mock-friendly until backend wiring).
 */
export function UserPresenceBadge(props: Props) {
  const { t } = useLanguage();
  if (props.role === 'helper') {
    const status = props.status ?? 'available';
    return (
      <span
        className={clsx(
          'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
          helperSkin[status],
        )}
        title={t(helperKey[status])}
      >
        <span className={clsx('h-1.5 w-1.5 rounded-full shrink-0', helperDot[status])} aria-hidden />
        {t(helperKey[status])}
      </span>
    );
  }
  const status = props.status ?? 'seeking';
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
        clientSkin[status],
      )}
      title={t(clientKey[status])}
    >
      <span className={clsx('h-1.5 w-1.5 rounded-full shrink-0', clientDot[status])} aria-hidden />
      {t(clientKey[status])}
    </span>
  );
}
