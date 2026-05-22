import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppMode } from '@/context/AppModeContext';
import { useLanguage } from '@/context/LanguageContext';
import { ROUTES } from '@/utils/constants';

type Props = {
  className?: string;
  /** When set, navigates here instead of the role default dashboard. */
  to?: string;
  /** Show inside modals (default: desktop breakpoint only). */
  alwaysVisible?: boolean;
  /** Called after navigation (e.g. close a modal). */
  onAfterNavigate?: () => void;
};

/** Desktop-only back control — returns to the workspace home for the active mode. */
export function DesktopBackButton({ className = '', to, alwaysVisible = false, onAfterNavigate }: Props) {
  const navigate = useNavigate();
  const { isHelperMode } = useAppMode();
  const { t } = useLanguage();
  const target = to ?? (isHelperMode ? ROUTES.helperDashboard : ROUTES.clientDashboard);

  return (
    <button
      type="button"
      onClick={() => {
        navigate(target);
        onAfterNavigate?.();
      }}
      className={`${alwaysVisible ? 'inline-flex' : 'hidden lg:inline-flex'} items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800 ${className}`}
    >
      <ArrowLeft className="h-4 w-4 shrink-0" />
      {t('nav.back')}
    </button>
  );
}
