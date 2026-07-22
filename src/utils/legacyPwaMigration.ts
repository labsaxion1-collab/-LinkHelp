import { isAppHost, isFluxHost, isLegacyWwwPublicHostname } from '@/utils/linkhelpHosts';
import { isPwaStandalone, type StandaloneWindow } from '@/utils/pwaRuntime';

export type LegacyPwaMigrationContext = {
  hostname?: string;
  standalone?: boolean;
  win?: StandaloneWindow;
};

/**
 * Legacy PWA installed from www/linkhelp.app before app.linkhelp.app migration.
 * Shows migration screen instead of institutional landing.
 *
 * Future: optional SW/cache cleanup after user opens app — not automatic in v1.
 */
export function shouldShowLegacyPwaMigration(ctx: LegacyPwaMigrationContext = {}): boolean {
  const hostname =
    ctx.hostname ?? (typeof window !== 'undefined' ? window.location.hostname : '');
  if (!hostname) return false;

  const standalone = ctx.standalone ?? isPwaStandalone(ctx.win);
  if (!standalone) return false;

  if (isAppHost(hostname) || isFluxHost(hostname)) return false;

  return isLegacyWwwPublicHostname(hostname);
}
