import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  BriefcaseBusiness,
  CheckCircle2,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { LogoIcon } from '@/components/ui/Logo';
import { ROUTES } from '@/utils/constants';

const clientSteps = [
  {
    title: 'Publique o que precisa',
    body: 'Descreva o servico, local, prazo e detalhes importantes em poucos minutos.',
    icon: Search,
  },
  {
    title: 'Receba helpers interessados',
    body: 'Acompanhe candidaturas, veja informacoes do perfil e converse com seguranca.',
    icon: MessageCircle,
  },
  {
    title: 'Escolha e acompanhe',
    body: 'Combine detalhes, confirme o servico e mantenha tudo organizado no app.',
    icon: BadgeCheck,
  },
];

const helperSteps = [
  {
    title: 'Encontre oportunidades',
    body: 'Veja pedidos proximos, filtre por categoria e escolha trabalhos alinhados ao seu perfil.',
    icon: BriefcaseBusiness,
  },
  {
    title: 'Use LinkCredits com controle',
    body: 'Demonstre interesse em oportunidades e acompanhe seus creditos disponiveis.',
    icon: Banknote,
  },
  {
    title: 'Cresca com reputacao',
    body: 'Construa perfil, conclua servicos e aumente sua presenca dentro da plataforma.',
    icon: UserRound,
  },
];

const trustItems = [
  'Chat protegido antes da contratacao',
  'Perfis organizados para decisao rapida',
  'Fluxo mobile-first para usar no dia a dia',
  'Categorias e oportunidades em tempo real',
];

export default function HowItWorksPage() {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#050816] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_6%,rgba(51,182,255,0.24),transparent_30%),radial-gradient(circle_at_84%_24%,rgba(37,99,255,0.22),transparent_32%),linear-gradient(180deg,#061B3D_0%,#050816_42%,#050816_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.14)_1px,transparent_1px)] [background-size:42px_42px] opacity-[0.07]" />

      <main className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col gap-16 px-5 py-12 sm:px-6 lg:px-8">
        <section className="grid min-h-[58vh] items-center gap-10 lg:grid-cols-[1.02fr_0.98fr]">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-sky-200 backdrop-blur-xl">
              <Sparkles className="h-4 w-4" />
              Como funciona
            </div>
            <h1 className="text-4xl font-black leading-[0.98] tracking-tight sm:text-6xl lg:text-7xl">
              LinkHelp conecta pedidos reais a helpers preparados.
            </h1>
            <p className="mt-6 max-w-2xl text-base font-medium leading-8 text-[#C7D2FE]/80 sm:text-lg">
              Uma experiencia simples para quem precisa de ajuda e para quem quer encontrar oportunidades locais com rapidez,
              confianca e organizacao.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to={`${ROUTES.signup}?role=client`}
                className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-[#2563FF] px-6 text-sm font-black text-white shadow-[0_18px_42px_rgba(37,99,255,0.34)] transition hover:brightness-110"
              >
                Preciso de ajuda
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to={`${ROUTES.signup}?role=helper`}
                className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-6 text-sm font-black text-white backdrop-blur-xl transition hover:bg-white/[0.1]"
              >
                Quero ser helper
              </Link>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -inset-8 rounded-[3rem] bg-[#2563FF]/20 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/[0.07] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
              <div className="flex items-center justify-between rounded-[1.6rem] bg-white/[0.08] p-4 ring-1 ring-white/10">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2563FF]">
                    <LogoIcon className="h-7 w-7" />
                  </span>
                  <div>
                    <p className="text-sm font-black">LinkHelp</p>
                    <p className="text-xs font-semibold text-sky-100/65">Marketplace local</p>
                  </div>
                </div>
                <ShieldCheck className="h-6 w-6 text-emerald-300" />
              </div>
              <div className="mt-5 space-y-3">
                {trustItems.map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/[0.06] px-4 py-3 ring-1 ring-white/8">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-[#33B6FF]" />
                    <span className="text-sm font-bold text-white/90">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <StepGroup eyebrow="Para clientes" title="Do pedido ao servico confirmado" steps={clientSteps} />
          <StepGroup eyebrow="Para helpers" title="Da oportunidade ao crescimento" steps={helperSteps} />
        </section>

        <section className="overflow-hidden rounded-[2.25rem] border border-white/10 bg-white/[0.06] p-6 backdrop-blur-2xl sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-200">Seguranca e clareza</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Tudo pensado para reduzir atrito.</h2>
              <p className="mt-4 text-sm font-medium leading-7 text-[#C7D2FE]/78 sm:text-base">
                O LinkHelp organiza conversa, perfil, oportunidades e creditos em uma jornada simples. Assim, cada usuario sabe
                o proximo passo sem depender de processos confusos.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ['1', 'Crie ou encontre pedidos'],
                ['2', 'Converse dentro da plataforma'],
                ['3', 'Confirme detalhes com seguranca'],
                ['4', 'Acompanhe sua atividade'],
              ].map(([number, label]) => (
                <div key={number} className="rounded-[1.5rem] bg-white/[0.07] p-5 ring-1 ring-white/10">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#2563FF] text-sm font-black">
                    {number}
                  </span>
                  <p className="mt-4 text-sm font-black text-white">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function StepGroup({
  eyebrow,
  title,
  steps,
}: {
  eyebrow: string;
  title: string;
  steps: Array<{ title: string; body: string; icon: typeof Search }>;
}) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:p-6">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-[#33B6FF]">{eyebrow}</p>
      <h2 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">{title}</h2>
      <div className="mt-6 space-y-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div key={step.title} className="flex gap-4 rounded-[1.5rem] bg-white/[0.06] p-4 ring-1 ring-white/8">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EEF3FF] text-[#2563FF]">
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-wide text-sky-100/50">Etapa {index + 1}</p>
                <h3 className="mt-1 text-base font-black text-white">{step.title}</h3>
                <p className="mt-1 text-sm font-medium leading-6 text-[#C7D2FE]/72">{step.body}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
