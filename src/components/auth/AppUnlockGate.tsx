import { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Fingerprint, Loader2, LogIn } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { BRAND } from '@/utils/brandAssets';
import { ROUTES } from '@/utils/constants';
import {
  APP_UNLOCK_BACKGROUND_TOLERANCE_MS,
  isSameUnlockUser,
  readAppUnlockPreference,
  shouldLockAfterBackground,
  shouldLockOnColdStart,
  type AppUnlockGateState,
} from '@/utils/appUnlockStorage';
import {
  isWebAuthnSupported,
  passkeyErrorMessageKey,
  signInWithDevicePasskey,
} from '@/utils/passkeyAuth';

/**
 * Local privacy gate: keeps the Supabase session, hides private UI until
 * Passkey re-verification. Not a substitute for logout or server auth.
 */
export function AppUnlockGate() {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { session, sessionConfirmed, signOut } = useAuth();
  const userId = session?.user?.id ?? null;

  const [state, setState] = useState<AppUnlockGateState>('checking');
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const hiddenAtRef = useRef<number | null>(null);
  const unlockingRef = useRef(false);
  const stateRef = useRef<AppUnlockGateState>('checking');
  const lockedUserIdRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(userId);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  useEffect(() => {
    if (!sessionConfirmed || !userId) {
      setState('checking');
      return;
    }
    const pref = readAppUnlockPreference(userId);
    if (
      shouldLockOnColdStart({
        hasSession: true,
        preferenceEnabled: pref,
      })
    ) {
      lockedUserIdRef.current = userId;
      setState('locked');
      return;
    }
    setState('unlocked');
  }, [sessionConfirmed, userId]);

  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;

    const isUnlockCeremonyActive = () =>
      unlockingRef.current || stateRef.current === 'unlocking';

    const onVisibility = () => {
      const id = userIdRef.current;
      const pref = id ? readAppUnlockPreference(id) : false;
      if (!pref) return;

      if (document.visibilityState === 'hidden') {
        // WebAuthn / system picker briefly hides the page — ignore during ceremony.
        if (isUnlockCeremonyActive()) return;
        hiddenAtRef.current = Date.now();
        return;
      }

      if (
        shouldLockAfterBackground({
          preferenceEnabled: pref,
          hiddenAtMs: hiddenAtRef.current,
          nowMs: Date.now(),
          toleranceMs: APP_UNLOCK_BACKGROUND_TOLERANCE_MS,
          unlocking: isUnlockCeremonyActive(),
        })
      ) {
        lockedUserIdRef.current = id;
        setState('locked');
        setErrorKey(null);
      }
      hiddenAtRef.current = null;
    };

    const onPageHide = () => {
      if (isUnlockCeremonyActive()) return;
      const id = userIdRef.current;
      const pref = id ? readAppUnlockPreference(id) : false;
      if (!pref) return;
      hiddenAtRef.current = Date.now();
    };

    const onPageShow = () => {
      const id = userIdRef.current;
      const pref = id ? readAppUnlockPreference(id) : false;
      if (!pref) return;
      if (
        shouldLockAfterBackground({
          preferenceEnabled: pref,
          hiddenAtMs: hiddenAtRef.current,
          nowMs: Date.now(),
          unlocking: isUnlockCeremonyActive(),
        })
      ) {
        lockedUserIdRef.current = id;
        setState('locked');
        setErrorKey(null);
      }
      hiddenAtRef.current = null;
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, []);

  const handleUnlock = useCallback(async () => {
    setErrorKey(null);
    if (!isWebAuthnSupported()) {
      setState('error');
      setErrorKey('app_pages.settings_passkey_unsupported');
      return;
    }
    unlockingRef.current = true;
    setState('unlocking');
    const result = await signInWithDevicePasskey();
    unlockingRef.current = false;

    if (result.ok === false) {
      setState('locked');
      setErrorKey(passkeyErrorMessageKey(result.code));
      if (result.code === 'cancelled') {
        showToast(t('app_unlock.cancelled'), 'info');
      }
      return;
    }

    const unlockedId = result.data.userId ?? null;
    const expectedId = lockedUserIdRef.current ?? userId;
    if (!isSameUnlockUser(expectedId, unlockedId)) {
      setState('locked');
      setErrorKey('app_unlock.wrong_account');
      showToast(t('app_unlock.wrong_account'), 'error');
      await signOut();
      navigate(ROUTES.login, { replace: true });
      return;
    }

    setState('unlocked');
    setErrorKey(null);
  }, [navigate, showToast, signOut, t, userId]);

  const handleOtherMethod = useCallback(async () => {
    unlockingRef.current = false;
    await signOut();
    navigate(ROUTES.login, { replace: true });
  }, [navigate, signOut]);

  if (!sessionConfirmed) {
    return null;
  }

  if (state === 'checking') {
    return (
      <div
        className="flex min-h-[100dvh] items-center justify-center bg-[#0B1220]"
        data-testid="app-unlock-checking"
        aria-busy="true"
      >
        <Loader2 className="h-8 w-8 animate-spin text-white/70" aria-hidden />
      </div>
    );
  }

  if (state === 'unlocked') {
    return <Outlet />;
  }

  return (
    <div
      className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#0B1220] px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]"
      data-testid="app-unlock-locked"
      data-app-unlock-state={state}
    >
      <img
        src={BRAND.logoIcon}
        alt=""
        className="h-16 w-16 object-contain"
        decoding="async"
      />
      <h1 className="mt-5 text-center text-xl font-black text-white">{t('app_unlock.title')}</h1>
      <p className="mt-2 max-w-sm text-center text-sm font-medium leading-relaxed text-white/70">
        {t('app_unlock.body')}
      </p>
      {errorKey ? (
        <p className="mt-3 max-w-sm text-center text-sm font-semibold text-amber-300" role="alert">
          {t(errorKey)}
        </p>
      ) : null}

      <button
        type="button"
        disabled={state === 'unlocking'}
        onClick={() => void handleUnlock()}
        className="mt-8 inline-flex min-h-[48px] w-full max-w-sm items-center justify-center gap-2 rounded-2xl bg-[#2563FF] px-4 text-sm font-black text-white hover:bg-[#1D4ED8] disabled:opacity-60"
        data-testid="app-unlock-passkey"
      >
        {state === 'unlocking' ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Fingerprint className="h-4 w-4" aria-hidden />
        )}
        {t('app_unlock.unlock_cta')}
      </button>

      <button
        type="button"
        disabled={state === 'unlocking'}
        onClick={() => void handleOtherMethod()}
        className="mt-3 inline-flex min-h-[44px] w-full max-w-sm items-center justify-center gap-2 rounded-2xl border border-white/20 bg-transparent px-4 text-sm font-bold text-white/85 hover:bg-white/5 disabled:opacity-60"
        data-testid="app-unlock-other-method"
      >
        <LogIn className="h-4 w-4" aria-hidden />
        {t('app_unlock.other_method')}
      </button>
    </div>
  );
}
