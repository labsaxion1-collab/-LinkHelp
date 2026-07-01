import { ChevronRight, LockKeyhole, ShieldCheck, Sparkles, Zap } from 'lucide-react';

import backgroundImage from '@/assets/hero/backgrounds/helper/backgound.png';
import medalImage from '@/assets/hero/medals/helper/novo helper.png';
import particlesImage from '@/assets/hero/particles/particulas.png';
import pedestalImage from '@/assets/hero/pedestal/pedestal.png';
import { BRAND } from '@/utils/brandAssets';

type Props = {
  avatarUrl?: string | null;
  balance?: number | null;
  completedServices: number;
  connectedProfessionals: number;
  rating: number;
  satisfactionRate?: number | null;
};

const benefits = [
  { icon: ShieldCheck, title: 'Seguro', detail: 'Verificados' },
  { icon: Zap, title: 'Rápido', detail: 'Em minutos' },
  { icon: LockKeyhole, title: 'Confiável', detail: 'Avaliações reais' },
] as const;

export function NewHelperHero({ balance, completedServices, connectedProfessionals, rating, satisfactionRate }: Props) {
  const displayBalance = balance == null ? '—' : Math.max(0, Math.round(balance)).toLocaleString('pt-BR');

  return (
    <section className="relative isolate mb-4 w-full overflow-hidden border-y border-lime-400/15 bg-[#020804] text-white shadow-[0_22px_58px_rgba(0,20,7,0.32)] sm:rounded-[1.75rem] sm:border">
      <img src={backgroundImage} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-95" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,rgba(99,230,28,0.2),transparent_34%),linear-gradient(180deg,rgba(0,5,2,0.91),rgba(1,12,4,0.66)_36%,rgba(0,5,2,0.95)_82%)]" />
      <img src={particlesImage} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-70 mix-blend-screen" />

      <div className="relative z-10 px-3 pb-4 pt-3 sm:px-8 sm:pb-6 sm:pt-5">
        <header className="flex items-center justify-end">
          <div className="flex min-w-0 items-center">
            <div className="flex min-w-0 items-center gap-1.5 rounded-full border border-lime-400/20 bg-black/30 px-2 py-1.5 backdrop-blur-md sm:min-w-[15rem] sm:gap-3 sm:px-5 sm:py-2.5">
              <img src={BRAND.linkCreditCoin} alt="" className="h-8 w-8 shrink-0 object-contain sm:h-11 sm:w-11" />
              <div className="min-w-0 sm:flex-1">
                <p className="hidden text-xs text-white/70 sm:block">Saldo disponível</p>
                <p className="whitespace-nowrap text-sm font-black sm:text-xl">{displayBalance} LC</p>
              </div>
              <ChevronRight className="hidden h-6 w-6 text-white/35 sm:block" />
            </div>
          </div>
        </header>

        <div className="mx-auto mt-4 max-w-[25rem] text-center sm:mt-6">
          <p className="mb-1.5 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-lime-300 sm:text-xs">
            <Sparkles className="h-3.5 w-3.5" /> Sua jornada começa aqui
          </p>
          <h1 className="text-[1.85rem] font-black leading-[1.04] tracking-[-0.045em] min-[430px]:text-[2.15rem] sm:text-5xl">
            Toda grande jornada começa com o <span className="text-lime-500">primeiro passo.</span>
          </h1>
        </div>

        <div className="relative mx-auto mt-0 min-h-[20.75rem] w-full max-w-[27rem] sm:min-h-[28.5rem] sm:max-w-[35rem]">
          <img src={medalImage} alt="Medalha Novo Helper" className="pointer-events-none absolute left-1/2 top-[36%] z-10 w-[70%] -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_0_30px_rgba(132,204,22,0.46)] sm:w-[64%]" />
          <img src={pedestalImage} alt="" aria-hidden="true" className="pointer-events-none absolute bottom-[7%] left-1/2 z-0 w-[122%] max-w-none -translate-x-1/2 drop-shadow-[0_20px_32px_rgba(0,0,0,0.85)] sm:w-[108%]" />
          <div className="absolute bottom-[7%] left-1/2 z-20 w-full -translate-x-1/2 text-center">
            <p className="text-[1.35rem] font-black uppercase tracking-tight text-lime-100 drop-shadow-[0_2px_12px_rgba(104,190,30,0.85)] sm:text-3xl">1. Novo Helper</p>
            <span className="mt-2 inline-flex min-w-[8.25rem] justify-center rounded-full border border-lime-300/35 bg-gradient-to-b from-lime-400 to-green-800 px-5 py-1.5 text-base font-black shadow-[0_0_22px_rgba(132,204,22,0.32)] sm:min-w-[10rem] sm:text-lg">Nível 1</span>
          </div>
        </div>

        <p className="mx-auto -mt-3 max-w-[22rem] text-center text-sm font-medium leading-relaxed text-white/68 sm:max-w-[34rem] sm:text-lg">
          Continue aprendendo, oferecendo excelentes serviços e conquistando a confiança dos clientes.
        </p>

        <div className="mx-auto mt-4 grid max-w-[35rem] grid-cols-3 overflow-hidden rounded-2xl border border-lime-400/15 bg-black/30 backdrop-blur-md">
          {benefits.map(({ icon: Icon, title, detail }, index) => (
            <div key={title} className={`flex min-w-0 flex-col items-center gap-1 px-1 py-2.5 text-center ${index > 0 ? 'border-l border-lime-300/10' : ''}`}>
              <Icon className="h-6 w-6 text-lime-500 sm:h-7 sm:w-7" strokeWidth={2.2} />
              <p className="text-[11px] font-black sm:text-sm">{title}</p>
              <p className="hidden text-[10px] text-white/55 min-[390px]:block">{detail}</p>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-4 max-w-[45rem] rounded-2xl border border-lime-400/15 bg-black/40 px-3 py-2.5 backdrop-blur-lg sm:px-5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-blue-300/20 bg-blue-500/15 text-blue-300"><ShieldCheck className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1"><p className="text-[10px] text-white/65 sm:text-xs">Próximo nível</p><p className="truncate text-xs font-black uppercase text-lime-400 sm:text-base">2. Helper Confiável</p></div>
            <span className="text-lg font-black sm:text-xl">35%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.07]"><span className="block h-full w-[35%] rounded-full bg-gradient-to-r from-lime-500 to-lime-300 shadow-[0_0_14px_rgba(163,230,53,0.36)]" /></div>
          <p className="mt-1.5 text-center text-[10px] text-white/55 sm:text-xs">Mais 130 pontos para alcançar o próximo nível</p>
        </div>
      </div>
    </section>
  );
}
