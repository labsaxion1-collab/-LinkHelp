/**
 * Static hero visuals for the compact dashboard rank card — same assets as full heroes.
 */
import bgVerde from '@/assets/hero/backgrounds/helper/bg-verde.png';
import bgRoxoHelper from '@/assets/hero/backgrounds/helper/bg-roxo.png';
import bgDouradoFlare from '@/assets/hero/backgrounds/helper/bg-dourado-flare.png';
import bgMagenta from '@/assets/hero/backgrounds/helper/bg-magenta.png';
import bgDouradoClient from '@/assets/hero/backgrounds/client/bg-dourado.png';
import bgRoxoClient from '@/assets/hero/backgrounds/client/bg-roxo.png';
import bgDouradoFlareClient from '@/assets/hero/backgrounds/client/bg-dourado-flare.png';
import particlesImage from '@/assets/hero/particles/particulas.png';
import pedestalVerde from '@/assets/hero/pedestal/pedestal-verde.png';
import pedestalAzul from '@/assets/hero/pedestal/pedestal-azul.png';
import pedestalDourado from '@/assets/hero/pedestal/pedestal-dourado.png';
import pedestalRoxo from '@/assets/hero/pedestal/pedestal-roxo.png';
import pedestalMagenta from '@/assets/hero/pedestal/pedestal-magenta.png';
import pedestalDouradoElite from '@/assets/hero/pedestal/pedestal-dourado-elite.png';
import { clientConfiavelPrimarySrc, CLIENT_CONFIAVEL_HERO_MEDIA } from '@/gamification/hero/clientConfiavelHeroMedia';
import { DEFAULT_HERO_KEY, resolveHeroKey } from '@/gamification/config/heroKeys';
import type { UserType } from '@/gamification/types/gamification';

export type CompactRankHeroVisual = {
  background: string;
  pedestal: string;
  particles: string;
  /** Dark scrim over background photo */
  scrim: string;
};

const HELPER_NOVO: CompactRankHeroVisual = {
  background: bgVerde,
  pedestal: pedestalVerde,
  particles: particlesImage,
  scrim:
    'radial-gradient(circle at 18% 40%, rgba(99,230,28,0.22), transparent 42%), linear-gradient(180deg, rgba(0,5,2,0.88) 0%, rgba(1,12,4,0.72) 45%, rgba(0,5,2,0.94) 100%)',
};

const HELPER_AZUL: CompactRankHeroVisual = {
  background: bgRoxoHelper,
  pedestal: pedestalAzul,
  particles: particlesImage,
  scrim:
    'radial-gradient(circle at 20% 42%, rgba(0,71,255,0.24), transparent 44%), linear-gradient(180deg, rgba(4,8,24,0.9) 0%, rgba(8,16,40,0.74) 48%, rgba(3,6,18,0.95) 100%)',
};

const HELPER_DOURADO: CompactRankHeroVisual = {
  background: bgDouradoFlare,
  pedestal: pedestalDourado,
  particles: particlesImage,
  scrim:
    'radial-gradient(circle at 22% 40%, rgba(251,191,36,0.2), transparent 42%), linear-gradient(180deg, rgba(24,14,2,0.9) 0%, rgba(36,20,4,0.74) 48%, rgba(18,10,2,0.95) 100%)',
};

const HELPER_MAGENTA: CompactRankHeroVisual = {
  background: bgMagenta,
  pedestal: pedestalRoxo,
  particles: particlesImage,
  scrim:
    'radial-gradient(circle at 20% 40%, rgba(168,85,247,0.22), transparent 42%), linear-gradient(180deg, rgba(18,4,28,0.9) 0%, rgba(28,8,40,0.74) 48%, rgba(14,2,22,0.95) 100%)',
};

const HELPER_TOP: CompactRankHeroVisual = {
  background: bgMagenta,
  pedestal: pedestalMagenta,
  particles: particlesImage,
  scrim:
    'radial-gradient(circle at 20% 40%, rgba(236,72,153,0.22), transparent 42%), linear-gradient(180deg, rgba(24,4,18,0.9) 0%, rgba(36,8,28,0.74) 48%, rgba(18,2,14,0.95) 100%)',
};

const HELPER_LENDA: CompactRankHeroVisual = {
  background: bgDouradoFlare,
  pedestal: pedestalDouradoElite,
  particles: particlesImage,
  scrim:
    'radial-gradient(circle at 22% 40%, rgba(34,197,94,0.18), transparent 42%), linear-gradient(180deg, rgba(8,18,10,0.9) 0%, rgba(12,28,14,0.74) 48%, rgba(4,12,6,0.95) 100%)',
};

const CLIENT_NOVO: CompactRankHeroVisual = HELPER_NOVO;

const CLIENT_CONFIAVEL: CompactRankHeroVisual = {
  background: clientConfiavelPrimarySrc(CLIENT_CONFIAVEL_HERO_MEDIA.background),
  pedestal: clientConfiavelPrimarySrc(CLIENT_CONFIAVEL_HERO_MEDIA.pedestal),
  particles: clientConfiavelPrimarySrc(CLIENT_CONFIAVEL_HERO_MEDIA.particles),
  scrim:
    'radial-gradient(circle at 20% 42%, rgba(0,71,255,0.24), transparent 44%), linear-gradient(180deg, rgba(4,8,24,0.9) 0%, rgba(8,16,40,0.74) 48%, rgba(3,6,18,0.95) 100%)',
};

const CLIENT_OURO: CompactRankHeroVisual = {
  background: bgDouradoClient,
  pedestal: pedestalDourado,
  particles: particlesImage,
  scrim: HELPER_DOURADO.scrim,
};

const CLIENT_VIP: CompactRankHeroVisual = {
  background: bgRoxoClient,
  pedestal: pedestalRoxo,
  particles: particlesImage,
  scrim:
    'radial-gradient(circle at 20% 40%, rgba(124,58,237,0.22), transparent 42%), linear-gradient(180deg, rgba(14,4,28,0.9) 0%, rgba(22,8,40,0.74) 48%, rgba(10,2,20,0.95) 100%)',
};

const CLIENT_ELITE: CompactRankHeroVisual = {
  background: bgDouradoFlareClient,
  pedestal: pedestalDouradoElite,
  particles: particlesImage,
  scrim: HELPER_LENDA.scrim,
};

const COMPACT_RANK_BY_HERO_KEY: Record<string, CompactRankHeroVisual> = {
  helper_novo: HELPER_NOVO,
  client_novo: CLIENT_NOVO,
  helper_confiavel: HELPER_AZUL,
  client_confiavel: CLIENT_CONFIAVEL,
  helper_profissional: HELPER_DOURADO,
  helper_elite: HELPER_MAGENTA,
  helper_top_helper: HELPER_TOP,
  helper_lenda: HELPER_LENDA,
  client_ouro: CLIENT_OURO,
  client_vip: CLIENT_VIP,
  client_elite: CLIENT_ELITE,
};

export function resolveCompactRankHeroVisual(
  userType: UserType,
  heroKey?: string | null,
): CompactRankHeroVisual {
  const resolved = resolveHeroKey(userType, heroKey ?? DEFAULT_HERO_KEY[userType]);
  return COMPACT_RANK_BY_HERO_KEY[resolved] ?? COMPACT_RANK_BY_HERO_KEY[DEFAULT_HERO_KEY[userType]];
}
