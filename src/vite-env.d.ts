/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_REQUIRE_AUTH?: string;
  /** Production site origin (no trailing slash). Used for OAuth `redirectTo` when not in dev. */
  readonly VITE_SITE_URL?: string;
  /** Set to `implicit` to use hash-based OAuth tokens instead of PKCE (if code_verifier issues persist). */
  readonly VITE_SUPABASE_AUTH_FLOW?: string;
  /** Google Maps JavaScript API key (public; restrict by HTTP referrer in Google Cloud). */
  readonly VITE_GOOGLE_MAPS_PLATFORM_KEY?: string;
  /**
   * Dev/preview only: simulate `www` | `app` | `flux` host routing on localhost or *.vercel.app.
   * Ignored in production builds.
   */
  readonly VITE_LINKHELP_HOST_PROFILE?: string;
  /** Injected at build from Vercel `VERCEL_ENV` (preview / production / development). */
  readonly VITE_VERCEL_ENV?: string;
  /** Set to `false` to force PNG for Cliente Confiável hero (debug only). */
  readonly VITE_CLIENT_CONFIAVEL_HERO_WEBP?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Chromium install prompt */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  prompt(): Promise<void>;
}
