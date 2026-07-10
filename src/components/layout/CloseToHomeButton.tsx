import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { useAppMode } from '@/context/AppModeContext';
import { useLanguage } from '@/context/LanguageContext';
import { ROUTES } from '@/utils/constants';

type Props = {
  className?: string;
  /** Extra work before navigating home (ex.: fechar modal / limpar draft). */
  onBeforeNavigate?: () => void;
};

/** X padrão: em qualquer tela, volta para a home do papel (cliente ou helper). */
export function CloseToHomeButton({ className, onBeforeNavigate }: Props) {
  const navigate = useNavigate();
  const { isHelperMode } = useAppMode();
  const { t } = useLanguage();
  const home = isHelperMode ? ROUTES.helperDashboard : ROUTES.clientDashboard;

  return (
    <button
      type="button"
      onClick={() => {
        onBeforeNavigate?.();
        navigate(home, { replace: true });
      }}
      className={clsx(
        'shrink-0 rounded-full bg-gray-100 p-2 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700',
        className,
      )}
      aria-label={t('common.close')}
    >
      <X className="h-5 w-5" />
    </button>
  );
}

/** Fecha overlay e navega para a home do papel atual. */
export function useCloseToHome() {
  const navigate = useNavigate();
  const { isHelperMode } = useAppMode();
  const home = isHelperMode ? ROUTES.helperDashboard : ROUTES.clientDashboard;

  return (onBeforeNavigate?: () => void) => {
    onBeforeNavigate?.();
    navigate(home, { replace: true });
  };
}
