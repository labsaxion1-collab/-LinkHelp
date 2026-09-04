import { useCallback, useEffect, useState } from 'react';
import { Fingerprint, Loader2, Trash2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import {
  isWebAuthnSupported,
  listDevicePasskeys,
  passkeyErrorMessageKey,
  registerDevicePasskey,
  revokeDevicePasskey,
  type PasskeyListItem,
} from '@/utils/passkeyAuth';

export function PasskeySecurityPanel() {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [passkeys, setPasskeys] = useState<PasskeyListItem[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await listDevicePasskeys();
    if (result.ok) {
      setPasskeys(result.data);
    } else {
      setPasskeys([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onEnable = async () => {
    if (!isWebAuthnSupported()) {
      showToast(t('app_pages.settings_passkey_unsupported'), 'error');
      return;
    }
    setBusy(true);
    const result = await registerDevicePasskey();
    setBusy(false);
    if (result.ok === false) {
      showToast(t(passkeyErrorMessageKey(result.code)), 'error');
      return;
    }
    showToast(t('app_pages.settings_passkey_success'), 'success');
    await refresh();
  };

  const onRevoke = async (id: string) => {
    setBusy(true);
    const result = await revokeDevicePasskey(id);
    setBusy(false);
    if (result.ok === false) {
      showToast(t(passkeyErrorMessageKey(result.code)), 'error');
      return;
    }
    showToast(t('app_pages.settings_passkey_revoked'), 'success');
    await refresh();
  };

  return (
    <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
          <Fingerprint className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-black text-slate-900">{t('app_pages.settings_passkey_title')}</h3>
          <p className="mt-1 text-xs font-medium leading-relaxed text-slate-600">
            {t('app_pages.settings_passkey_desc')}
          </p>
        </div>
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={() => void onEnable()}
        className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#2563FF] px-4 text-sm font-bold text-white hover:bg-[#1D4ED8] disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Fingerprint className="h-4 w-4" aria-hidden />}
        {t('app_pages.settings_passkey_enable')}
      </button>

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
          {t('app_pages.settings_passkey_list')}
        </p>
        {loading ? (
          <p className="text-sm text-slate-500">…</p>
        ) : passkeys.length === 0 ? (
          <p className="text-sm font-medium text-slate-500">{t('app_pages.settings_passkey_empty')}</p>
        ) : (
          <ul className="space-y-2">
            {passkeys.map((pk) => (
              <li
                key={pk.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">
                    {pk.friendly_name?.trim() || pk.id.slice(0, 8)}
                  </p>
                  {pk.created_at ? (
                    <p className="text-[11px] font-medium text-slate-500">{pk.created_at}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onRevoke(pk.id)}
                  className="inline-flex min-h-[40px] items-center gap-1 rounded-lg border border-red-100 px-2.5 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  {t('app_pages.settings_passkey_revoke')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
