import { useCallback, useEffect, useState } from 'react';
import { Fingerprint, Loader2, X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import {
  clearPasskeyInviteEligibleFlag,
  consumePasskeyInviteEligibleFlag,
  peekPasskeyInviteEligibleFlag,
  readPasskeyInviteAnswered,
  writePasskeyInviteAnswered,
} from '@/utils/passkeyInviteStorage';
import {
  isWebAuthnSupported,
  listDevicePasskeys,
  passkeyErrorMessageKey,
  registerDevicePasskey,
} from '@/utils/passkeyAuth';

/**
 * Optional one-shot invite after interactive login.
 * Does not force Passkey; “Agora não” never blocks app access.
 */
export function PasskeyInvitePrompt() {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const { session, sessionConfirmed } = useAuth();
  const userId = session?.user?.id ?? null;
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function evaluate() {
      if (!sessionConfirmed || !userId) {
        setVisible(false);
        return;
      }
      if (!peekPasskeyInviteEligibleFlag()) {
        setVisible(false);
        return;
      }
      if (!isWebAuthnSupported()) {
        clearPasskeyInviteEligibleFlag();
        setVisible(false);
        return;
      }
      if (readPasskeyInviteAnswered(userId)) {
        clearPasskeyInviteEligibleFlag();
        setVisible(false);
        return;
      }

      const listed = await listDevicePasskeys();
      if (cancelled) return;
      if (listed.ok && listed.data.length > 0) {
        // Already has a passkey — never duplicate; mark answered and skip.
        writePasskeyInviteAnswered(userId);
        clearPasskeyInviteEligibleFlag();
        setVisible(false);
        return;
      }

      consumePasskeyInviteEligibleFlag();
      setVisible(true);
    }

    void evaluate();
    return () => {
      cancelled = true;
    };
  }, [sessionConfirmed, userId]);

  const dismiss = useCallback(() => {
    if (userId) writePasskeyInviteAnswered(userId);
    clearPasskeyInviteEligibleFlag();
    setVisible(false);
  }, [userId]);

  const onEnable = useCallback(async () => {
    if (!userId) return;
    setBusy(true);
    const result = await registerDevicePasskey();
    setBusy(false);
    if (result.ok === false) {
      showToast(t(passkeyErrorMessageKey(result.code)), 'error');
      // Stay dismissible; do not mark answered on cancel/error so Security panel remains the path —
      // but “Agora não” / close still marks answered. Cancel on ceremony: keep invite closed this session only.
      if (result.code === 'cancelled') {
        setVisible(false);
        clearPasskeyInviteEligibleFlag();
        return;
      }
      setVisible(false);
      clearPasskeyInviteEligibleFlag();
      return;
    }
    writePasskeyInviteAnswered(userId);
    clearPasskeyInviteEligibleFlag();
    setVisible(false);
    showToast(t('app_pages.settings_passkey_success'), 'success');
  }, [showToast, t, userId]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 p-4 sm:items-center"
      data-testid="passkey-invite-prompt"
      role="dialog"
      aria-modal="true"
      aria-labelledby="passkey-invite-title"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
            <Fingerprint className="h-5 w-5" aria-hidden />
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label={t('common.close')}
            data-testid="passkey-invite-dismiss-x"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <h2 id="passkey-invite-title" className="mt-3 text-lg font-black text-slate-900">
          {t('passkey_invite.title')}
        </h2>
        <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
          {t('passkey_invite.body')}
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => void onEnable()}
          className="mt-5 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-[#2563FF] px-4 text-sm font-black text-white hover:bg-[#1D4ED8] disabled:opacity-60"
          data-testid="passkey-invite-enable"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Fingerprint className="h-4 w-4" aria-hidden />}
          {t('passkey_invite.enable')}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={dismiss}
          className="mt-2 inline-flex min-h-[44px] w-full items-center justify-center rounded-2xl border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          data-testid="passkey-invite-later"
        >
          {t('passkey_invite.later')}
        </button>
      </div>
    </div>
  );
}
