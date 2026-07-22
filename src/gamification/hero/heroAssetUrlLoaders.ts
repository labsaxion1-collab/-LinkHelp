/**
 * URLs dos assets por heroKey — cada nível carrega só seus PNGs via import() dinâmico.
 */

export type HeroAssetUrlSet = {
  essential: readonly string[];
  deferred: readonly string[];
};

type HeroAssetLoader = () => Promise<HeroAssetUrlSet>;

const particlesLoader = () =>
  import('@/assets/hero/particles/particulas.png?url').then((m) => m.default);

const HERO_ASSET_LOADERS: Record<string, HeroAssetLoader> = {
  helper_novo: async () => {
    const [bg, medal, pedestal] = await Promise.all([
      import('@/assets/hero/backgrounds/helper/bg-verde.png?url'),
      import('@/assets/hero/medals/helper/novo helper.png?url'),
      import('@/assets/hero/pedestal/pedestal-verde.png?url'),
    ]);
    return {
      essential: [bg.default, medal.default, pedestal.default],
      deferred: [await particlesLoader()],
    };
  },
  client_novo: async () => {
    const [bg, medal, pedestal] = await Promise.all([
      import('@/assets/hero/backgrounds/helper/bg-verde.png?url'),
      import('@/assets/hero/medals/client/novo cliente.png?url'),
      import('@/assets/hero/pedestal/pedestal-verde.png?url'),
    ]);
    return {
      essential: [bg.default, medal.default, pedestal.default],
      deferred: [await particlesLoader()],
    };
  },
  helper_confiavel: async () => {
    const [bg, medal, pedestal] = await Promise.all([
      import('@/assets/hero/backgrounds/helper/bg-roxo.png?url'),
      import('@/assets/hero/medals/helper/iniciante.png?url'),
      import('@/assets/hero/pedestal/pedestal-azul.png?url'),
    ]);
    return {
      essential: [bg.default, medal.default, pedestal.default],
      deferred: [await particlesLoader()],
    };
  },
  client_confiavel: async () => {
    const [bg, medal, pedestal] = await Promise.all([
      import('@/assets/hero/backgrounds/client/bg-roxo.png?url'),
      import('@/assets/hero/medals/client/confiavel.png?url'),
      import('@/assets/hero/pedestal/pedestal-azul.png?url'),
    ]);
    return {
      essential: [bg.default, medal.default, pedestal.default],
      deferred: [await particlesLoader()],
    };
  },
  helper_profissional: async () => {
    const [bg, medal, pedestal] = await Promise.all([
      import('@/assets/hero/backgrounds/helper/bg-dourado-flare.png?url'),
      import('@/assets/hero/medals/helper/profissional.png?url'),
      import('@/assets/hero/pedestal/pedestal-dourado.png?url'),
    ]);
    return {
      essential: [bg.default, medal.default, pedestal.default],
      deferred: [await particlesLoader()],
    };
  },
  helper_elite: async () => {
    const [bg, medal, pedestal] = await Promise.all([
      import('@/assets/hero/backgrounds/helper/bg-magenta.png?url'),
      import('@/assets/hero/medals/helper/elite.png?url'),
      import('@/assets/hero/pedestal/pedestal-roxo.png?url'),
    ]);
    return {
      essential: [bg.default, medal.default, pedestal.default],
      deferred: [await particlesLoader()],
    };
  },
  helper_top_helper: async () => {
    const [bg, medal, pedestal] = await Promise.all([
      import('@/assets/hero/backgrounds/helper/bg-magenta.png?url'),
      import('@/assets/hero/medals/helper/top.png?url'),
      import('@/assets/hero/pedestal/pedestal-magenta.png?url'),
    ]);
    return {
      essential: [bg.default, medal.default, pedestal.default],
      deferred: [await particlesLoader()],
    };
  },
  helper_lenda: async () => {
    const [bg, medal, pedestal] = await Promise.all([
      import('@/assets/hero/backgrounds/helper/bg-dourado-flare.png?url'),
      import('@/assets/hero/medals/helper/lenda.png?url'),
      import('@/assets/hero/pedestal/pedestal-dourado-elite.png?url'),
    ]);
    return {
      essential: [bg.default, medal.default, pedestal.default],
      deferred: [await particlesLoader()],
    };
  },
  client_ouro: async () => {
    const [bg, medal, pedestal] = await Promise.all([
      import('@/assets/hero/backgrounds/client/bg-dourado.png?url'),
      import('@/assets/hero/medals/client/ouro.png?url'),
      import('@/assets/hero/pedestal/pedestal-dourado.png?url'),
    ]);
    return {
      essential: [bg.default, medal.default, pedestal.default],
      deferred: [await particlesLoader()],
    };
  },
  client_vip: async () => {
    const [bg, medal, pedestal] = await Promise.all([
      import('@/assets/hero/backgrounds/client/bg-roxo.png?url'),
      import('@/assets/hero/medals/client/vip.png?url'),
      import('@/assets/hero/pedestal/pedestal-roxo.png?url'),
    ]);
    return {
      essential: [bg.default, medal.default, pedestal.default],
      deferred: [await particlesLoader()],
    };
  },
  client_elite: async () => {
    const [bg, medal, pedestal] = await Promise.all([
      import('@/assets/hero/backgrounds/client/bg-dourado-flare.png?url'),
      import('@/assets/hero/medals/client/elite.png?url'),
      import('@/assets/hero/pedestal/pedestal-dourado-elite.png?url'),
    ]);
    return {
      essential: [bg.default, medal.default, pedestal.default],
      deferred: [await particlesLoader()],
    };
  },
};

const assetInflight = new Map<string, Promise<HeroAssetUrlSet>>();

export async function loadHeroAssetUrls(heroKey: string): Promise<HeroAssetUrlSet> {
  const loader = HERO_ASSET_LOADERS[heroKey];
  if (!loader) {
    return { essential: [], deferred: [] };
  }
  const existing = assetInflight.get(heroKey);
  if (existing) return existing;
  const promise = loader().finally(() => assetInflight.delete(heroKey));
  assetInflight.set(heroKey, promise);
  return promise;
}

/** Test-only */
export function resetHeroAssetInflightForTests(): void {
  assetInflight.clear();
}

export function getKnownHeroAssetLoaderKeys(): string[] {
  return Object.keys(HERO_ASSET_LOADERS);
}
