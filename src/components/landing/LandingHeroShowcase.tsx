import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import { WaitlistForm } from './WaitlistForm';

const ease = [0.22, 1, 0.36, 1] as const;

export function LandingHeroShowcase() {
  const reduceMotion = useReducedMotion();
  const focusWaitlist = () => {
    const input = document.querySelector('#liste input') as HTMLInputElement | null;
    input?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    window.setTimeout(() => input?.focus({ preventScroll: true }), reduceMotion ? 0 : 500);
  };

  return (
    <>
      <section id="accueil" className="relative isolate overflow-hidden bg-[#032c82] text-white">
        <div className="relative min-h-[24rem] sm:min-h-[36rem] lg:min-h-[46rem]">
          <img src="/brand/landpage1.png" alt="Présentation de l’univers Link Help avec Max Québec" className="absolute inset-0 h-full w-full object-cover object-center" width="1254" height="1254" loading="eager" />
          <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(180deg,transparent,rgba(3,44,130,.18))]" />
          <svg aria-hidden="true" viewBox="0 0 1440 180" preserveAspectRatio="none" className="absolute -bottom-px left-0 h-24 w-full overflow-visible sm:h-32 lg:h-40">
            <defs>
              <linearGradient id="hero-curve-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#03348f" />
                <stop offset="58%" stopColor="#064ab7" />
                <stop offset="100%" stopColor="#075dd7" />
              </linearGradient>
            </defs>
            <path d="M 0 0 Q 720 205 1440 0 L 1440 180 L 0 180 Z" fill="url(#hero-curve-gradient)" />
            <path d="M 0 0 Q 720 205 1440 0" fill="none" stroke="#0877f9" strokeWidth="7" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </svg>
        </div>

        <div className="relative -mt-px bg-[linear-gradient(180deg,#075dd7_0%,#064ab7_24%,#043d9e_56%,#021f61_100%)] px-5 pb-14 pt-7 sm:px-8 sm:pb-20 sm:pt-9">
          <div aria-hidden="true" className="absolute left-1/2 top-0 h-44 w-[80%] -translate-x-1/2 rounded-full bg-[#1c78f2]/18 blur-3xl" />
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75, ease }} className="relative z-10 mx-auto -mt-16 max-w-5xl text-center sm:-mt-24 lg:-mt-32">
            <span className="inline-flex translate-y-2 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-bold shadow-[inset_0_1px_0_rgba(255,255,255,.12)] backdrop-blur-xl sm:text-sm"><Sparkles className="h-4 w-4" /> Une nouvelle façon de s’entraider</span>
            <h1 className="mx-auto mt-7 max-w-4xl text-balance text-[2.75rem] font-extrabold leading-[.98] tracking-[-.055em] sm:text-6xl lg:text-[5rem]">Le bon coup de main, <span className="bg-[linear-gradient(100deg,#fff,#8fd4ff)] bg-clip-text text-transparent">au bon moment.</span></h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-white/78 sm:text-xl sm:leading-8">Découvrez une expérience locale pensée pour rapprocher les besoins et les talents de votre communauté.</p>
            <div className="mx-auto mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row sm:justify-center">
              <button onClick={focusWaitlist} className="inline-flex min-h-14 flex-1 items-center justify-center gap-3 rounded-full bg-white px-7 text-base font-bold text-[#0647c8] shadow-[0_18px_45px_rgba(0,16,66,.28)] transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/35">Rejoindre la liste d&apos;attente <ArrowRight className="h-5 w-5" /></button>
              <a href="#audiences-title" className="inline-flex min-h-14 flex-1 items-center justify-center rounded-full border border-[#5da8ff]/70 bg-[#0754bd]/35 px-7 text-base font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,.12)] backdrop-blur transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30">Choisir votre parcours</a>
            </div>
            <p className="mt-5 text-sm font-medium text-white/62">Inscription gratuite · Aucun engagement</p>

          </motion.div>
        </div>
      </section>
      <section id="liste" aria-label="Liste d’attente" className="relative -mt-px scroll-mt-24 bg-[linear-gradient(180deg,#021f61_0%,#063f9f_11%,#4f8ed8_27%,#c9def6_52%,#edf5ff_78%,#f7faff_100%)] px-2 pb-10 pt-12 sm:px-5 sm:pb-14 sm:pt-16">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.65, ease }} className="mx-auto w-full max-w-5xl overflow-hidden rounded-[1.75rem] bg-white text-[#0b1930] shadow-[0_22px_65px_rgba(19,60,112,.12)] sm:rounded-[2rem]">
          <WaitlistForm />
        </motion.div>
      </section>
      <section aria-labelledby="audiences-title" className="relative bg-[#f7faff] px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-10 max-w-2xl text-center"><p className="text-xs font-bold uppercase tracking-[.22em] text-[#0866ff]">Deux façons de participer</p><h2 id="audiences-title" className="mt-3 text-balance text-3xl font-bold tracking-[-.04em] sm:text-4xl">Une communauté, deux parcours.</h2></div>
          <div className="grid gap-6 lg:grid-cols-2">
            <motion.article initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="group overflow-hidden rounded-[2rem] border border-[#dce7f3] bg-white shadow-[0_24px_65px_rgba(32,66,103,.1)]">
              <div className="overflow-hidden bg-[#eaf3ff]"><img src="/brand/landing-client-card.png" alt="Aperçu visuel du parcours client Link Help" className="aspect-[4/3] w-full object-cover object-center transition duration-500 group-hover:scale-[1.025] sm:aspect-[16/10]" loading="lazy" /></div>
              <div className="p-7 sm:p-9"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#0866ff]">Pour les clients</p><h3 className="mt-4 max-w-xl text-[1.85rem] font-bold leading-[1.1] tracking-[-.04em] sm:text-4xl">Trouvez la bonne personne pour vous aider.</h3><div className="mt-7 space-y-4 text-sm font-semibold text-[#536277] sm:text-base">{['Profils faciles à comprendre', 'Helpers locaux', 'Choix qui vous appartient'].map((item) => <p key={item} className="flex items-start gap-3"><Check className="mt-0.5 h-5 w-5 shrink-0 text-[#0866ff]" />{item}</p>)}</div></div>
            </motion.article>

            <motion.article initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.08 }} className="group overflow-hidden rounded-[2rem] bg-[#0b1930] text-white shadow-[0_28px_70px_rgba(11,25,48,.2)]">
              <div className="overflow-hidden bg-[#0e2d5d]"><img src="/brand/landing-helper-card.png" alt="Aperçu visuel du parcours helper Link Help" className="aspect-[4/3] w-full object-cover object-center transition duration-500 group-hover:scale-[1.025] sm:aspect-[16/10]" loading="lazy" /></div>
              <div className="relative p-7 sm:p-9"><div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(8,102,255,.22),transparent_50%)]" /><div className="relative"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#7eb3ff]">Pour les helpers</p><h3 className="mt-4 max-w-xl text-[1.85rem] font-bold leading-[1.1] tracking-[-.04em] sm:text-4xl">Faites reconnaître votre savoir-faire.</h3><div className="mt-7 space-y-4 text-sm font-semibold text-white/72 sm:text-base">{['Opportunités locales', 'Profil et progression', 'Expérience pensée mobile'].map((item) => <p key={item} className="flex items-start gap-3"><Check className="mt-0.5 h-5 w-5 shrink-0 text-[#7eb3ff]" />{item}</p>)}</div></div></div>
            </motion.article>
          </div>
        </div>
      </section>
    </>
  );
}
