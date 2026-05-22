import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured, resetSupabaseBrowserClient, LINKHELP_AUTH_STORAGE_KEY } from '@/lib/supabase';
import { authDevLog, authFlowLog } from '@/lib/authDebug';
import type { Database } from '@/types/supabase.database';
import type { ProfileRow, UserType } from '@/types/database';
import type { AuthFlowError } from '@/types/authFlowError';
import { mapProfileWriteError, mapSupabaseAuthError } from '@/services/authErrorMap';
import { getOAuthRedirectToUrl } from '@/utils/oauthRedirect';
import { readKeepSignedIn } from '@/utils/rememberSession';

export type AuthProfile = ProfileRow;
export type AuthError = AuthFlowError;

type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: AuthProfile | null;
  authLoading: boolean;
  authBootstrapped: boolean;
  isConfigured: boolean;
  signInWithEmail: (email: string, password: string) => Promise<AuthError>;
  signUpWithEmail: (
    email: string,
    password: string,
    meta: {
      fullName: string;
      userType: UserType;
      city?: string;
      region?: string;
      country?: string;
      phone?: string;
      acceptedTerms?: boolean;
      acceptedTermsAt?: string;
      helperTermsAccepted?: boolean;
      helperTermsAcceptedAt?: string;
      preferredLanguage?: string;
    },
  ) => Promise<AuthError>;
  signInWithGoogle: () => Promise<AuthError>;
  signOut: () => Promise<void>;
  refreshProfile: (userOverride?: User | null) => Promise<AuthProfile | null>;
  updateProfile: (patch: Partial<AuthProfile>) => Promise<AuthError>;
  /** Re-read session from the client / refresh tokens — use when React state is null but storage may still hold a session. */
  attemptSessionRecovery: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchProfile(userId: string): Promise<AuthProfile | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) {
    authDevLog('fetchProfile:error', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      userId,
    });
    return null;
  }
  if (!data) return null;
  return data as AuthProfile;
}

function buildProfileInsert(user: User): ProfileInsert {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const str = (k: string) => (typeof meta[k] === 'string' ? (meta[k] as string).trim() : '');
  const nameFromParts = [str('given_name'), str('family_name')].filter(Boolean).join(' ').trim();
  const nameRaw =
    str('full_name') ||
    str('name') ||
    nameFromParts ||
    user.email?.split('@')[0] ||
    '';
  const name = nameRaw ? nameRaw : null;
  const rawRole = str('user_type');
  const role: 'client' | 'helper' = rawRole === 'helper' ? 'helper' : 'client';
  const avatarRaw = str('avatar_url') || str('picture');
  const avatar_url = avatarRaw || null;
  const city = str('city') || null;
  const region = str('region') || str('province') || null;
  const country = str('country') || null;
  const phone = str('phone') || null;
  const preferred_language = str('preferred_language') || null;
  const rawSpoken = meta.spoken_languages;
  const spoken_languages = Array.isArray(rawSpoken)
    ? rawSpoken.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    : preferred_language
      ? [preferred_language]
      : null;

  const providers = user.app_metadata?.providers;
  const isGoogle =
    user.app_metadata?.provider === 'google' ||
    (Array.isArray(providers) && providers.includes('google'));

  const metaBool = (k: string) => meta[k] === true || meta[k] === 'true';
  const accepted_terms = isGoogle || metaBool('accepted_terms');
  const accepted_terms_at = accepted_terms ? str('accepted_terms_at') || new Date().toISOString() : null;
  const helper_terms_accepted = metaBool('helper_terms_accepted');
  const helper_terms_accepted_at = helper_terms_accepted ? str('helper_terms_accepted_at') || new Date().toISOString() : null;

  return {
    id: user.id,
    name,
    email: user.email ?? null,
    avatar_url,
    role,
    credits: 0,
    city,
    region,
    country,
    phone,
    preferred_language,
    spoken_languages,
    accepted_terms,
    accepted_terms_at,
    helper_terms_accepted,
    helper_terms_accepted_at,
  };
}

function missingProfileColumnName(error: { message?: string } | null | undefined): string | null {
  const message = error?.message ?? '';
  const match = message.match(/'([^']+)' column of 'profiles'/i);
  return match?.[1] ?? null;
}

function withoutColumn<T extends Record<string, unknown>>(payload: T, column: string): T {
  const next = { ...payload };
  delete next[column];
  if (column === 'helper_terms_accepted' || column === 'helper_terms_accepted_at') {
    delete next.helper_terms_accepted;
    delete next.helper_terms_accepted_at;
  }
  if (column === 'accepted_terms' || column === 'accepted_terms_at') {
    delete next.accepted_terms;
    delete next.accepted_terms_at;
  }
  return next;
}

async function ensureProfileViaRpc(user: User, row: ProfileInsert): Promise<AuthProfile | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const { data, error } = await sb.rpc('ensure_profile_for_current_user', {
    p_role: row.role,
    p_name: row.name ?? null,
    p_city: row.city ?? null,
    p_region: row.region ?? null,
    p_country: row.country ?? null,
    p_phone: row.phone ?? null,
    p_preferred_language: row.preferred_language ?? null,
    p_spoken_languages: row.spoken_languages ?? null,
  });

  if (error) {
    authDevLog('ensureProfileViaRpc:error', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      userId: user.id,
    });
    return null;
  }

  return data ? (data as AuthProfile) : null;
}

/** Ensures a `profiles` row exists (RLS: insert own row). */
async function ensureProfileFromUser(user: User): Promise<AuthProfile | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const row = buildProfileInsert(user);
  authDevLog('ensureProfileFromUser:upsert:start', {
    userId: user.id,
    email: user.email,
    role: row.role,
    provider: user.app_metadata?.provider,
  });

  const rpcProfile = await ensureProfileViaRpc(user, row);
  if (rpcProfile) return rpcProfile;

  let { data, error } = await sb.from('profiles').upsert(row, { onConflict: 'id' }).select('*').maybeSingle();

  const missingColumn = missingProfileColumnName(error);
  if (missingColumn) {
    const retryRow = withoutColumn(row as Record<string, unknown>, missingColumn) as ProfileInsert;
    const retry = await sb.from('profiles').upsert(retryRow, { onConflict: 'id' }).select('*').maybeSingle();
    data = retry.data;
    error = retry.error;
  }

  if (!error && data) {
    authDevLog('ensureProfileFromUser:upsert:ok', { userId: user.id });
    return data as AuthProfile;
  }

  if (error) {
    const mapped = mapProfileWriteError(error);
    authDevLog('ensureProfileFromUser:upsert:error', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      mappedKey: mapped.messageKey,
    });
    console.warn('[LinkHelp] Profile upsert failed:', error.message);
  }

  const again = await fetchProfile(user.id);
  if (again) return again;

  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  /** True until first auth resolution for configured Supabase — avoids treating “unknown” as logged out. */
  const [authLoading, setAuthLoading] = useState(() => isSupabaseConfigured());
  const [authBootstrapped, setAuthBootstrapped] = useState(false);

  const sessionRef = useRef<Session | null>(null);
  sessionRef.current = session;

  const profileSyncTargetRef = useRef<string | null>(null);

  const refreshProfile = useCallback(async (userOverride?: User | null): Promise<AuthProfile | null> => {
    const user = userOverride ?? sessionRef.current?.user;
    const uid = user?.id;
    if (!uid || !isSupabaseConfigured()) {
      setProfile(null);
      return null;
    }
    let p = await fetchProfile(uid);
    if (!p && user) {
      p = await ensureProfileFromUser(user);
    }
    setProfile(p);
    return p;
  }, []);

  const attemptSessionRecovery = useCallback(async (): Promise<boolean> => {
    if (!isSupabaseConfigured()) return false;
    const sb = getSupabase();
    if (!sb) return false;

    const { data: d1 } = await sb.auth.getSession();
    if (d1.session) {
      authFlowLog('attemptSessionRecovery: getSession found session', { userId: d1.session.user.id });
      setSession(d1.session);
      setAuthLoading(true);
      const targetId = d1.session.user.id;
      profileSyncTargetRef.current = targetId;
      try {
        let p = await fetchProfile(targetId);
        if (!p && d1.session.user) p = await ensureProfileFromUser(d1.session.user);
        setProfile(p);
      } finally {
        setAuthLoading(false);
      }
      return true;
    }

    authFlowLog('attemptSessionRecovery: calling refreshSession', {});
    const { data: d2, error } = await sb.auth.refreshSession();
    if (error) {
      authFlowLog('attemptSessionRecovery: refreshSession error', { message: error.message });
    }
    if (d2.session) {
      authFlowLog('attemptSessionRecovery: refreshSession restored session', { userId: d2.session.user.id });
      setSession(d2.session);
      setAuthLoading(true);
      const targetId = d2.session.user.id;
      profileSyncTargetRef.current = targetId;
      try {
        let p = await fetchProfile(targetId);
        if (!p && d2.session.user) p = await ensureProfileFromUser(d2.session.user);
        setProfile(p);
      } finally {
        setAuthLoading(false);
      }
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      authDevLog('AuthProvider:init', { configured: false });
      setAuthLoading(false);
      setSession(null);
      setProfile(null);
      setAuthBootstrapped(true);
      return;
    }

    const sb = getSupabase()!;
    let cancelled = false;

    const syncSession = (next: Session | null) => {
      if (cancelled) return;
      setSession(next);

      if (!next?.user) {
        profileSyncTargetRef.current = null;
        setProfile(null);
        setAuthLoading(false);
        return;
      }

      setAuthLoading(true);
      const targetId = next.user.id;
      profileSyncTargetRef.current = targetId;

      const run = async () => {
        try {
          let p = await fetchProfile(targetId);
          if (!p) p = await ensureProfileFromUser(next.user);
          if (cancelled || profileSyncTargetRef.current !== targetId) return;
          setProfile(p);
        } finally {
          if (!cancelled && profileSyncTargetRef.current === targetId) {
            setAuthLoading(false);
          }
        }
      };

      setTimeout(() => {
        void run();
      }, 0);
    };

    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((event, next) => {
      if (event === 'SIGNED_IN') {
        authFlowLog('User authenticated (SIGNED_IN)', {
          userId: next?.user?.id,
          email: next?.user?.email ?? undefined,
        });
      }
      if (import.meta.env.DEV) {
        console.log('[LinkHelp Auth] state changed', event, {
          userId: next?.user?.id,
          email: next?.user?.email,
          hasSession: !!next,
        });
      }
      authDevLog('onAuthStateChange', {
        event,
        userId: next?.user?.id,
        email: next?.user?.email,
        provider: next?.user?.app_metadata?.provider,
      });

      if (event === 'SIGNED_OUT') {
        authFlowLog('onAuthStateChange: SIGNED_OUT — clearing session', {});
        syncSession(null);
        return;
      }

      if (!next?.user) {
        void sb.auth.getSession().then(({ data: verify }) => {
          if (cancelled) return;
          if (verify.session) {
            authFlowLog('onAuthStateChange: recovered session after null payload', {
              event,
              userId: verify.session.user.id,
            });
            syncSession(verify.session);
          } else {
            syncSession(null);
          }
        });
        return;
      }

      syncSession(next);
    });

    void (async () => {
      try {
        await sb.auth.initialize();
      } catch (e) {
        authFlowLog('auth.initialize warning', {
          message: e instanceof Error ? e.message : String(e),
        });
      }
      if (cancelled) return;

      const { data, error } = await sb.auth.getSession();
      authFlowLog('getSession:initial', {
        hasSession: !!data.session,
        userId: data.session?.user?.id,
        email: data.session?.user?.email ?? undefined,
        error: error?.message,
      });
      authDevLog('getSession:initial', {
        errorMessage: error?.message,
        errorName: error?.name,
        hasSession: !!data.session,
        userId: data.session?.user?.id,
        email: data.session?.user?.email,
        provider: data.session?.user?.app_metadata?.provider,
        providers: data.session?.user?.app_metadata?.providers,
      });
      if (import.meta.env.DEV && data.session?.user) {
        console.log('[LinkHelp Auth] User authenticated (initial getSession)', data.session.user.id, data.session.user.email);
      }

      let effectiveSession = data.session ?? null;
      if (!effectiveSession && typeof window !== 'undefined') {
        try {
          const stored = window.localStorage.getItem(LINKHELP_AUTH_STORAGE_KEY);
          if (stored && stored.length > 4 && stored !== 'null') {
            authFlowLog('bootstrap: empty getSession but persisted key present — trying refreshSession', {
              keyLength: stored.length,
            });
            const { data: refData, error: refErr } = await sb.auth.refreshSession();
            authFlowLog('bootstrap: refreshSession after storage hint', {
              hasSession: !!refData.session,
              err: refErr?.message,
            });
            effectiveSession = refData.session ?? null;
          }
        } catch (e) {
          authFlowLog('bootstrap: refreshSession threw', {
            message: e instanceof Error ? e.message : String(e),
          });
        }
      }

      syncSession(effectiveSession);
      if (!cancelled) setAuthBootstrapped(true);
    })();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string): Promise<AuthError> => {
    const sb = getSupabase();
    if (!sb) {
      authDevLog('signInWithPassword:aborted', { reason: 'supabase_client_null' });
      return { code: 'unavailable', messageKey: 'auth.errors.env_not_ready' };
    }
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    const status = error && 'status' in error ? (error as { status?: number }).status : undefined;
    authDevLog('signInWithPassword:result', {
      errorMessage: error?.message,
      errorCode: error && 'code' in error ? String((error as { code?: string }).code) : undefined,
      status,
      hasSession: !!data?.session,
      userId: data?.session?.user?.id,
    });
    if (error) {
      const mapped = mapSupabaseAuthError({ message: error.message, status });
      return {
        code: 'auth_failed',
        messageKey: mapped.messageKey,
        vars: mapped.vars,
        devRaw: import.meta.env.DEV ? error.message : undefined,
      };
    }
    return null;
  }, []);

  const signUpWithEmail = useCallback(
    async (
      email: string,
      password: string,
      meta: {
        fullName: string;
        userType: UserType;
        city?: string;
        region?: string;
        country?: string;
        phone?: string;
        acceptedTerms?: boolean;
        acceptedTermsAt?: string;
        helperTermsAccepted?: boolean;
        helperTermsAcceptedAt?: string;
        preferredLanguage?: string;
      },
    ): Promise<AuthError> => {
      const sb = getSupabase();
      if (!sb) {
        authDevLog('signUp:aborted', { reason: 'supabase_client_null' });
        return { code: 'unavailable', messageKey: 'auth.errors.env_not_ready' };
      }
      const now = new Date().toISOString();
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: meta.fullName,
            user_type: meta.userType,
            city: meta.city ?? '',
            region: meta.region ?? '',
            country: meta.country ?? '',
            phone: meta.phone ?? '',
            preferred_language: meta.preferredLanguage ?? '',
            spoken_languages: meta.preferredLanguage ? [meta.preferredLanguage] : [],
            accepted_terms: meta.acceptedTerms ?? false,
            accepted_terms_at: meta.acceptedTerms ? (meta.acceptedTermsAt ?? now) : '',
            helper_terms_accepted: meta.helperTermsAccepted ?? false,
            helper_terms_accepted_at: meta.helperTermsAccepted ? (meta.helperTermsAcceptedAt ?? now) : '',
          },
        },
      });
      const status = error && 'status' in error ? (error as { status?: number }).status : undefined;
      authDevLog('signUp:result', {
        errorMessage: error?.message,
        status,
        hasSession: !!data?.session,
        userId: data?.user?.id,
        identities: data?.user?.identities?.length,
      });
      if (error) {
        const mapped = mapSupabaseAuthError({ message: error.message, status });
        return {
          code: 'auth_failed',
          messageKey: mapped.messageKey,
          vars: mapped.vars,
          devRaw: import.meta.env.DEV ? error.message : undefined,
        };
      }
      return null;
    },
    [],
  );

  const signInWithGoogle = useCallback(async (): Promise<AuthError> => {
    const sb = getSupabase();
    if (!sb) {
      authDevLog('signInWithOAuth:aborted', { reason: 'supabase_client_null' });
      return { code: 'unavailable', messageKey: 'auth.errors.env_not_ready' };
    }
    const redirectTo = getOAuthRedirectToUrl();
    authFlowLog('OAuth redirectTo', {
      redirectTo,
      origin: typeof window !== 'undefined' ? window.location.origin : '',
      storageKey: LINKHELP_AUTH_STORAGE_KEY,
    });
    if (import.meta.env.DEV) {
      console.log('OAuth redirectTo', redirectTo);
      console.log('Current origin', window.location.origin);
    }
    const { data, error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: { prompt: 'select_account' },
        scopes: 'email profile',
        skipBrowserRedirect: false,
      },
    });
    const status = error && 'status' in error ? (error as { status?: number }).status : undefined;
    authDevLog('signInWithOAuth:result', {
      errorMessage: error?.message,
      status,
      oauthUrl: data?.url ? '(redirect URL generated)' : null,
      provider: 'google',
    });
    if (error) {
      const mapped = mapSupabaseAuthError({ message: error.message, status });
      return {
        code: 'auth_failed',
        messageKey: mapped.messageKey,
        vars: mapped.vars,
        devRaw: import.meta.env.DEV ? error.message : undefined,
      };
    }
    return null;
  }, []);

  const signOut = useCallback(async () => {
    const sb = getSupabase();
    profileSyncTargetRef.current = null;
    setSession(null);
    setProfile(null);
    setAuthLoading(false);
    if (typeof window !== 'undefined') {
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith(LINKHELP_AUTH_STORAGE_KEY) || (k.startsWith('sb-') && k.includes('-auth-token'))) {
          try {
            localStorage.removeItem(k);
          } catch {
            /* ignore */
          }
        }
      }
    }
    if (sb) {
      await sb.auth.signOut();
    }
    resetSupabaseBrowserClient();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onLeave = () => {
      if (!readKeepSignedIn() && sessionRef.current) {
        void signOut();
      }
    };
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, [signOut]);

  const updateProfile = useCallback(
    async (patch: Partial<AuthProfile>): Promise<AuthError> => {
      const sb = getSupabase();
      const uid = sessionRef.current?.user?.id;
      if (!sb || !uid) {
        return { code: 'auth_failed', messageKey: 'auth.errors.not_signed_in' };
      }

      const allowed: (keyof AuthProfile)[] = [
        'name',
        'avatar_url',
        'email',
        'bio',
        'city',
        'region',
        'country',
        'phone',
        'preferred_language',
        'spoken_languages',
        'role',
        'rating',
        'credits',
        'accepted_terms',
        'accepted_terms_at',
        'helper_terms_accepted',
        'helper_terms_accepted_at',
      ];
      const profilePatch: Partial<AuthProfile> = {};
      for (const k of allowed) {
        if (patch[k] !== undefined) {
          (profilePatch as Record<string, unknown>)[k] = patch[k];
        }
      }

      if (Object.keys(profilePatch).length === 0) return null;

      const user = sessionRef.current?.user;
      const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
      const metaRole = typeof meta.user_type === 'string' ? meta.user_type : '';
      const role: UserType = profile?.role ?? (metaRole === 'helper' ? 'helper' : 'client');
      const upsertPayload: Database['public']['Tables']['profiles']['Insert'] = {
        id: uid,
        role,
        email: user?.email ?? profile?.email ?? null,
        ...profilePatch,
      };

      let data: AuthProfile | null = null;
      let updateError: { message: string; code?: string; details?: string; hint?: string } | null = null;

      if (profile?.id) {
        const result = await sb
          .from('profiles')
          .update(profilePatch as Database['public']['Tables']['profiles']['Update'])
          .eq('id', uid)
          .select('*')
          .maybeSingle();
        data = result.data as AuthProfile | null;
        updateError = result.error;
      } else {
        const result = await sb
          .from('profiles')
          .upsert(upsertPayload, { onConflict: 'id' })
          .select('*')
          .maybeSingle();
        data = result.data as AuthProfile | null;
        updateError = result.error;
      }

      let missingColumn = missingProfileColumnName(updateError);
      if (missingColumn && profile?.id) {
        const retryPatch = withoutColumn(profilePatch as Record<string, unknown>, missingColumn) as Database['public']['Tables']['profiles']['Update'];
        const retry = await sb
          .from('profiles')
          .update(retryPatch)
          .eq('id', uid)
          .select('*')
          .maybeSingle();
        data = retry.data as AuthProfile | null;
        updateError = retry.error;
      } else if (missingColumn) {
        const retryPayload = withoutColumn(upsertPayload as Record<string, unknown>, missingColumn) as Database['public']['Tables']['profiles']['Insert'];
        const retry = await sb
          .from('profiles')
          .upsert(retryPayload, { onConflict: 'id' })
          .select('*')
          .maybeSingle();
        data = retry.data as AuthProfile | null;
        updateError = retry.error;
      }

      missingColumn = missingProfileColumnName(updateError);
      if (missingColumn && profile?.id) {
        const localProfile = { ...profile, ...withoutColumn(profilePatch as Record<string, unknown>, missingColumn) } as AuthProfile;
        setProfile(localProfile);
        return null;
      }

      if (updateError) {
        const updateOnly = await sb
          .from('profiles')
          .update(profilePatch as Database['public']['Tables']['profiles']['Update'])
          .eq('id', uid)
          .select('*')
          .maybeSingle();
        data = updateOnly.data as AuthProfile | null;
        updateError = updateOnly.error;
      }

      if (updateError) {
        const missingOnUpdate = missingProfileColumnName(updateError);
        if (missingOnUpdate) {
          const localProfile = { ...(profile ?? upsertPayload), ...withoutColumn(profilePatch as Record<string, unknown>, missingOnUpdate) } as AuthProfile;
          setProfile(localProfile);
          return null;
        }
      }

      if (updateError) {
        authDevLog('updateProfile:error', {
          message: updateError.message,
          code: updateError.code,
          details: updateError.details,
          hint: updateError.hint,
        });
        const mapped = mapProfileWriteError(updateError);
        return {
          code: 'profile_failed',
          messageKey: mapped.messageKey,
          vars: mapped.vars,
          devRaw: import.meta.env.DEV ? updateError.message : undefined,
        };
      }

      if (data) {
        setProfile(data as AuthProfile);
      } else {
        setProfile((prev) => (prev ? ({ ...prev, ...profilePatch } as AuthProfile) : prev));
        await refreshProfile();
      }
      return null;
    },
    [profile, refreshProfile],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      authLoading,
      authBootstrapped,
      isConfigured: isSupabaseConfigured(),
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      signOut,
      refreshProfile,
      updateProfile,
      attemptSessionRecovery,
    }),
    [
      session,
      profile,
      authLoading,
      authBootstrapped,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      signOut,
      refreshProfile,
      updateProfile,
      attemptSessionRecovery,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
