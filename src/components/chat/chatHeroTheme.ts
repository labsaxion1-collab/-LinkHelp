export type ChatHeroAccentTheme = {
  backgroundKey: 'green' | 'blue' | 'gold' | 'purple' | 'magenta' | 'elite';
  bandBase: string;
  bandOverlay: string;
  statusText: string;
  chipChevron: string;
  chipAccentText: string;
  chipBackdrop: string;
  serviceOverlay: string;
  serviceCta: string;
  sendActive: string;
  sendInactive: string;
  sendGlow: string;
  sendIconActive: string;
  sendIconInactive: string;
  focusRing: string;
  onlineDot: string;
};

const GREEN: ChatHeroAccentTheme = {
  backgroundKey: 'green',
  bandBase: 'bg-[#020804]',
  bandOverlay: 'bg-[radial-gradient(circle_at_72%_50%,rgba(99,230,28,0.22),transparent_42%),linear-gradient(90deg,rgba(0,5,2,0.94)_0%,rgba(1,12,4,0.78)_55%,rgba(0,5,2,0.92)_100%)]',
  statusText: 'text-lime-300/75',
  chipChevron: 'text-lime-300/70',
  chipAccentText: 'text-lime-300/80',
  chipBackdrop: 'bg-[#020804]/45',
  serviceOverlay: 'bg-[#020804]/45',
  serviceCta: 'border-lime-200 bg-lime-50 text-lime-700 hover:bg-lime-100',
  sendActive: 'border border-lime-400/40 bg-[#020804] text-lime-300 shadow-[0_4px_18px_rgba(34,197,94,0.42),inset_0_1px_0_rgba(255,255,255,0.12)] active:scale-95',
  sendInactive: 'border border-lime-400/25 bg-[#020804] text-lime-300/45',
  sendGlow: 'bg-[radial-gradient(circle_at_28%_18%,rgba(134,239,172,0.28),transparent_58%)]',
  sendIconActive: 'text-lime-100 drop-shadow-[0_0_8px_rgba(190,242,100,0.55)]',
  sendIconInactive: 'text-lime-300/75',
  focusRing: 'focus:ring-lime-400/20',
  onlineDot: 'bg-lime-500',
};

const BLUE: ChatHeroAccentTheme = {
  backgroundKey: 'blue',
  bandBase: 'bg-[#020817]',
  bandOverlay: 'bg-[radial-gradient(circle_at_72%_50%,rgba(0,71,255,0.54),transparent_42%),linear-gradient(90deg,rgba(0,4,20,0.97)_0%,rgba(0,18,70,0.88)_55%,rgba(0,4,20,0.96)_100%)]',
  statusText: 'text-[#7BA7FF]',
  chipChevron: 'text-[#7BA7FF]/90',
  chipAccentText: 'text-[#7BA7FF]',
  chipBackdrop: 'bg-[#020817]/45',
  serviceOverlay: 'bg-[#020817]/45',
  serviceCta: 'border-[#B8CAFF] bg-[#E7EEFF] text-[#003BFF] hover:bg-[#DCE6FF]',
  sendActive: 'border border-[#0047FF]/75 bg-[#020817] text-[#DCE6FF] shadow-[0_4px_24px_rgba(0,71,255,0.70),inset_0_1px_0_rgba(255,255,255,0.12)] active:scale-95',
  sendInactive: 'border border-[#0047FF]/40 bg-[#020817] text-[#7BA7FF]/50',
  sendGlow: 'bg-[radial-gradient(circle_at_28%_18%,rgba(0,71,255,0.52),transparent_58%)]',
  sendIconActive: 'text-white drop-shadow-[0_0_12px_rgba(59,130,255,0.82)]',
  sendIconInactive: 'text-[#7BA7FF]/75',
  focusRing: 'focus:ring-[#0047FF]/35',
  onlineDot: 'bg-[#0047FF]',
};

const GOLD: ChatHeroAccentTheme = {
  backgroundKey: 'gold',
  bandBase: 'bg-[#100902]',
  bandOverlay: 'bg-[radial-gradient(circle_at_72%_50%,rgba(251,191,36,0.30),transparent_42%),linear-gradient(90deg,rgba(12,7,0,0.95)_0%,rgba(42,24,0,0.80)_55%,rgba(10,5,0,0.94)_100%)]',
  statusText: 'text-amber-300/82',
  chipChevron: 'text-amber-300/75',
  chipAccentText: 'text-amber-300/85',
  chipBackdrop: 'bg-[#100902]/45',
  serviceOverlay: 'bg-[#100902]/45',
  serviceCta: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100',
  sendActive: 'border border-amber-300/45 bg-[#100902] text-amber-200 shadow-[0_4px_18px_rgba(245,158,11,0.42),inset_0_1px_0_rgba(255,255,255,0.12)] active:scale-95',
  sendInactive: 'border border-amber-300/25 bg-[#100902] text-amber-300/45',
  sendGlow: 'bg-[radial-gradient(circle_at_28%_18%,rgba(252,211,77,0.30),transparent_58%)]',
  sendIconActive: 'text-amber-100 drop-shadow-[0_0_8px_rgba(253,230,138,0.55)]',
  sendIconInactive: 'text-amber-300/75',
  focusRing: 'focus:ring-amber-400/20',
  onlineDot: 'bg-amber-500',
};

const PURPLE: ChatHeroAccentTheme = {
  backgroundKey: 'purple',
  bandBase: 'bg-[#080314]',
  bandOverlay: 'bg-[radial-gradient(circle_at_72%_50%,rgba(147,51,234,0.32),transparent_42%),linear-gradient(90deg,rgba(6,2,15,0.95)_0%,rgba(26,9,52,0.82)_55%,rgba(6,2,15,0.94)_100%)]',
  statusText: 'text-violet-300/82',
  chipChevron: 'text-violet-300/75',
  chipAccentText: 'text-violet-300/85',
  chipBackdrop: 'bg-[#080314]/45',
  serviceOverlay: 'bg-[#080314]/45',
  serviceCta: 'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100',
  sendActive: 'border border-violet-300/45 bg-[#080314] text-violet-200 shadow-[0_4px_18px_rgba(124,58,237,0.42),inset_0_1px_0_rgba(255,255,255,0.12)] active:scale-95',
  sendInactive: 'border border-violet-300/25 bg-[#080314] text-violet-300/45',
  sendGlow: 'bg-[radial-gradient(circle_at_28%_18%,rgba(196,181,253,0.30),transparent_58%)]',
  sendIconActive: 'text-violet-100 drop-shadow-[0_0_8px_rgba(221,214,254,0.55)]',
  sendIconInactive: 'text-violet-300/75',
  focusRing: 'focus:ring-violet-400/20',
  onlineDot: 'bg-violet-500',
};

const MAGENTA: ChatHeroAccentTheme = {
  backgroundKey: 'magenta',
  bandBase: 'bg-[#120214]',
  bandOverlay: 'bg-[radial-gradient(circle_at_72%_50%,rgba(236,72,153,0.32),transparent_42%),linear-gradient(90deg,rgba(12,1,12,0.95)_0%,rgba(48,4,35,0.82)_55%,rgba(10,1,10,0.94)_100%)]',
  statusText: 'text-pink-300/82',
  chipChevron: 'text-pink-300/75',
  chipAccentText: 'text-pink-300/85',
  chipBackdrop: 'bg-[#120214]/45',
  serviceOverlay: 'bg-[#120214]/45',
  serviceCta: 'border-pink-200 bg-pink-50 text-pink-700 hover:bg-pink-100',
  sendActive: 'border border-pink-300/45 bg-[#120214] text-pink-200 shadow-[0_4px_18px_rgba(236,72,153,0.42),inset_0_1px_0_rgba(255,255,255,0.12)] active:scale-95',
  sendInactive: 'border border-pink-300/25 bg-[#120214] text-pink-300/45',
  sendGlow: 'bg-[radial-gradient(circle_at_28%_18%,rgba(249,168,212,0.30),transparent_58%)]',
  sendIconActive: 'text-pink-100 drop-shadow-[0_0_8px_rgba(251,207,232,0.55)]',
  sendIconInactive: 'text-pink-300/75',
  focusRing: 'focus:ring-pink-400/20',
  onlineDot: 'bg-pink-500',
};

const HERO_TO_THEME: Record<string, ChatHeroAccentTheme> = {
  client_novo: GREEN,
  helper_novo: GREEN,
  client_confiavel: BLUE,
  helper_confiavel: BLUE,
  client_ouro: GOLD,
  helper_profissional: GOLD,
  client_vip: PURPLE,
  helper_elite: PURPLE,
  helper_top_helper: MAGENTA,
  client_elite: GOLD,
  helper_lenda: GOLD,
};

export function getChatHeroAccentTheme(heroKey?: string | null): ChatHeroAccentTheme {
  return heroKey ? HERO_TO_THEME[heroKey] ?? GREEN : GREEN;
}