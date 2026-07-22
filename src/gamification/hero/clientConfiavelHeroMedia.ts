/**
 * Media Cliente Confiável — WebP primário com fallback PNG (`<picture>`).
 */
import bgPng from '@/assets/hero/backgrounds/client/bg-roxo.png';
import medalPng from '@/assets/hero/medals/client/confiavel.png';
import pedestalPng from '@/assets/hero/pedestal/pedestal-azul.png';
import particlesPng from '@/assets/hero/particles/particulas.png';
import bgWebp from '@/assets/hero/_experiments/webp-p0/bg-roxo.webp?url';
import medalWebp from '@/assets/hero/_experiments/webp-p0/confiavel.webp?url';
import pedestalWebp from '@/assets/hero/_experiments/webp-p0/pedestal-azul.webp?url';
import particlesWebp from '@/assets/hero/_experiments/webp-p0/particulas.webp?url';

export type ClientConfiavelHeroMediaLayer = {
  png: string;
  webp: string;
};

export const CLIENT_CONFIAVEL_HERO_MEDIA = {
  background: { png: bgPng, webp: bgWebp },
  medal: { png: medalPng, webp: medalWebp },
  pedestal: { png: pedestalPng, webp: pedestalWebp },
  particles: { png: particlesPng, webp: particlesWebp },
} as const satisfies Record<string, ClientConfiavelHeroMediaLayer>;

/** Kill-switch local/debug (`VITE_CLIENT_CONFIAVEL_HERO_WEBP=false`). */
export function isClientConfiavelHeroWebpEnabled(): boolean {
  return import.meta.env.VITE_CLIENT_CONFIAVEL_HERO_WEBP !== 'false';
}

export function clientConfiavelPrimarySrc(layer: ClientConfiavelHeroMediaLayer): string {
  return isClientConfiavelHeroWebpEnabled() ? layer.webp : layer.png;
}

export function clientConfiavelPreloadUrls(): readonly string[] {
  if (!isClientConfiavelHeroWebpEnabled()) {
    return [
      CLIENT_CONFIAVEL_HERO_MEDIA.background.png,
      CLIENT_CONFIAVEL_HERO_MEDIA.medal.png,
      CLIENT_CONFIAVEL_HERO_MEDIA.pedestal.png,
    ];
  }
  return [
    CLIENT_CONFIAVEL_HERO_MEDIA.background.webp,
    CLIENT_CONFIAVEL_HERO_MEDIA.medal.webp,
    CLIENT_CONFIAVEL_HERO_MEDIA.pedestal.webp,
  ];
}

export function clientConfiavelDeferredPreloadUrls(): readonly string[] {
  return [
    isClientConfiavelHeroWebpEnabled()
      ? CLIENT_CONFIAVEL_HERO_MEDIA.particles.webp
      : CLIENT_CONFIAVEL_HERO_MEDIA.particles.png,
  ];
}
