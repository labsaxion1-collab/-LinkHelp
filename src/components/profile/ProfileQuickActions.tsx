import type { ElementType } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  CreditCard,
  FileText,
  HelpCircle,
  History,
  Images,
  Settings,
  Star,
} from 'lucide-react';
import { clsx } from 'clsx';
import { ProfileSectionHeader } from '@/components/profile/ProfileSectionHeader';
import { ROUTES } from '@/utils/constants';
import { UI_VISIBILITY } from '@/config/uiVisibility';

type Action = {
  key: string;
  label: string;
  icon: ElementType;
  iconColor: string;
  iconBg: string;
  to: string;
  ariaLabel?: string;
};

type Props = {
  title: string;
  role: 'client' | 'helper';
  labels: {
    buyCredits: string;
    myRequests: string;
    myApplications: string;
    myReviews: string;
    portfolio: string;
    help: string;
    history?: string;
    historyDesc?: string;
    settings: string;
  };
};

export function ProfileQuickActions({ title, role, labels }: Props) {
  const navigate = useNavigate();

  const actions: Action[] = [];

  if (role === 'client' && UI_VISIBILITY.clientCredits) {
    actions.push({
      key: 'buy',
      label: labels.buyCredits,
      icon: CreditCard,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50',
      to: ROUTES.clientCredits,
    });
  }
  if (role === 'helper' && UI_VISIBILITY.helperCreditPurchase) {
    actions.push({
      key: 'buy',
      label: labels.buyCredits,
      icon: CreditCard,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50',
      to: ROUTES.helperCredits,
    });
  }

  if (role === 'client') {
    actions.push({
      key: 'requests',
      label: labels.myRequests,
      icon: FileText,
      iconColor: 'text-violet-600',
      iconBg: 'bg-violet-50',
      to: ROUTES.clientJobs,
    });
  } else {
    actions.push({
      key: 'applications',
      label: labels.myApplications,
      icon: ClipboardList,
      iconColor: 'text-violet-600',
      iconBg: 'bg-violet-50',
      to: ROUTES.helperJobs,
    });
    actions.push({
      key: 'portfolio',
      label: labels.portfolio,
      icon: Images,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-50',
      to: `${ROUTES.helperDashboard}#portfolio`,
    });
  }

  actions.push(
    {
      key: 'reviews',
      label: labels.myReviews,
      icon: Star,
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-50',
      to: role === 'client' ? ROUTES.clientJobs : ROUTES.helperJobs,
    },
    {
      key: 'help',
      label: labels.help,
      icon: HelpCircle,
      iconColor: 'text-sky-600',
      iconBg: 'bg-sky-50',
      to: ROUTES.contact,
    },
    {
      key: 'settings',
      label: labels.settings,
      icon: Settings,
      iconColor: 'text-slate-600',
      iconBg: 'bg-slate-100',
      to: ROUTES.settings,
    },
  );

  if (role === 'helper' && labels.history) {
    actions.push({
      key: 'history',
      label: labels.history,
      icon: History,
      iconColor: 'text-indigo-600',
      iconBg: 'bg-indigo-50',
      to: ROUTES.helperHistory,
      ariaLabel: labels.historyDesc
        ? `${labels.history}. ${labels.historyDesc}`
        : labels.history,
    });
  }

  if (role === 'client' && labels.history) {
    actions.push({
      key: 'history',
      label: labels.history,
      icon: History,
      iconColor: 'text-indigo-600',
      iconBg: 'bg-indigo-50',
      to: ROUTES.clientHistory,
      ariaLabel: labels.historyDesc
        ? `${labels.history}. ${labels.historyDesc}`
        : labels.history,
    });
  }

  return (
    <section>
      <ProfileSectionHeader title={title} />
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.key}
              type="button"
              data-testid={`profile-shortcut-${action.key}`}
              aria-label={action.ariaLabel ?? action.label}
              onClick={() => navigate(action.to)}
              className="flex min-h-[88px] flex-col items-start gap-2.5 rounded-[1.25rem] border border-slate-200/90 bg-white px-3.5 py-3.5 text-left shadow-[0_8px_22px_rgba(15,23,42,0.045)] transition hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-[0_12px_28px_rgba(37,99,255,0.08)] active:scale-[0.99]"
            >
              <span
                className={clsx(
                  'flex h-9 w-9 items-center justify-center rounded-xl',
                  action.iconBg,
                  action.iconColor,
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="text-[12px] font-bold leading-snug text-slate-800">
                {action.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
