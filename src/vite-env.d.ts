/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_REQUIRE_AUTH?: string;
  /** Production site origin (no trailing slash). Used for OAuth `redirectTo` when not in dev. */
  readonly VITE_SITE_URL?: string;
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
