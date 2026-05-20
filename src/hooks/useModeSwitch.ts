import { useCallback } from 'react';
import { useAppMode } from '@/context/AppModeContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';

/** Client/helper mode switch with toast on failure and shared loading state. */
export function useModeSwitch() {
  const { switchToClient, switchToHelper, modeSwitchBusy } = useAppMode();
  const { showToast } = useToast();
  const { t } = useLanguage();

  const toHelper = useCallback(
    async (options?: { skipHelperPrep?: boolean }) => {
      const ok = await switchToHelper(options);
      if (!ok) showToast(t('nav.mode_switch_failed'), 'error');
      return ok;
    },
    [switchToHelper, showToast, t],
  );

  const toClient = useCallback(async () => {
    const ok = await switchToClient();
    if (!ok) showToast(t('nav.mode_switch_failed'), 'error');
    return ok;
  }, [switchToClient, showToast, t]);

  return { toHelper, toClient, modeSwitchBusy };
}
