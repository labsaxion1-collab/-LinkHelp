import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, BadgeCheck, Check, MapPin, ShieldCheck, Sparkles, UsersRound } from 'lucide-react';
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
      <section id="accueil" className="relative isolate overflow-hidden bg-[#063fc6] px-5 pb-14 pt-12 text-white sm:px-8 sm:pb-20 sm:pt-16 lg:pb-24">
        <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_64%_28%,#1676ff_0%,#0759e3_28%,#063fc6_58%,#032a91_100%)]" />
        <div className="absolute -right-28 top-8 -z-10 h-[34rem] w-[34rem] rounded-full border border-white/10 opacity-60" />
        <div className="absolute -right-10 top-32 -z-10 h-72 w-72 rounded-full bg-white/5 blur-2xl" />
        <div className="absolute bottom-0 left-0 right-0 -z-10 h-40 bg-[linear-gradient(180deg,transparent,rgba(0,22,87,.22))]" />

        <div className="mx-auto grid max-w-[90rem] items-center gap-10 xl:grid-cols-[.82fr_1.05fr_1.05fr]">
          <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.75, ease }} className="relative z-10 py-3 xl:py-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-bold backdrop-blur-xl"><Sparkles className="h-4 w-4" /> Bientôt au Québec</span>
            <h1 className="mt-7 max-w-xl text-balance text-[2.85rem] font-extrabold leading-[1.02] tracking-[-.055em] sm:text-6xl xl:text-[4.1rem]">Trouvez de l’aide près de chez vous. Simplement.</h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-white/78 sm:text-lg sm:leading-8">Link Help connecte les personnes qui ont besoin d’un coup de main avec des helpers locaux de leur communauté.</p>
            <div className="mt-8 grid max-w-lg grid-cols-3 gap-3 border-y border-white/15 py-5 text-xs font-semibold sm:text-sm">
              <span className="flex flex-col items-center gap-2 text-center sm:flex-row sm:text-left"><ShieldCheck className="h-5 w-5" /> Confiance</span>
              <span className="flex flex-col items-center gap-2 text-center sm:flex-row sm:text-left"><MapPin className="h-5 w-5" /> Local</span>
              <span className="flex flex-col items-center gap-2 text-center sm:flex-row sm:text-left"><UsersRound className="h-5 w-5" /> Humain</span>
            </div>
            <button onClick={focusWaitlist} className="mt-7 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-full bg-white px-7 text-sm font-bold text-[#0647c8] shadow-[0_18px_38px_rgba(0,19,73,.25)] transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/35 sm:w-auto">Rejoindre la liste <ArrowRight className="h-4 w-4" /></button>
          </motion.div>

          <div className="relative mx-auto min-h-[30rem] w-full max-w-[40rem] sm:min-h-[34rem] xl:min-h-[39rem]">
            <div aria-hidden="true" className="absolute inset-x-[4%] bottom-[5%] top-[7%] rounded-[45%] border border-white/10 bg-[radial-gradient(circle_at_58%_42%,rgba(78,167,255,.42),rgba(4,45,151,.08)_58%,transparent_72%)] shadow-[inset_0_0_80px_rgba(255,255,255,.06)]" />
            <div aria-hidden="true" className="absolute bottom-5 left-[14%] right-[4%] h-16 rounded-full bg-[#001650]/65 blur-2xl" />

            <motion.img
              src="/brand/max-landing.png"
              alt="Max Québec, mascotte officielle de Link Help"
              initial={{ opacity: 0, x: -24, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              transition={{ duration: 0.9, delay: 0.08, ease }}
              className="absolute bottom-0 left-[-9%] z-10 w-[92%] max-w-none object-contain drop-shadow-[0_32px_34px_rgba(0,17,66,.38)] sm:left-[-7%] sm:w-[88%] xl:left-[-14%] xl:w-[102%]"
              loading="eager"
            />

            <motion.img
              src="/brand/phone-landing.png"
              alt="Aperçu de l’application mobile Link Help"
              initial={{ opacity: 0, x: 28, y: 20, rotate: 3 }}
              animate={{ opacity: 1, x: 0, y: 0, rotate: 1.5 }}
              transition={{ duration: 0.9, delay: 0.22, ease }}
              className="absolute bottom-[3%] right-[-1%] z-20 h-[82%] w-auto object-contain drop-shadow-[0_36px_42px_rgba(0,12,56,.48)] sm:right-[1%] sm:h-[86%] xl:right-[-7%] xl:h-[91%]"
              loading="eager"
            />

            <motion.div
              aria-hidden="true"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.55, delay: 0.65, ease }}
              className="absolute right-[18%] top-[10%] z-0 h-24 w-24 rounded-full border border-white/15 bg-white/10 blur-[1px] sm:h-32 sm:w-32"
            />
          </div>
          <motion.div id="liste" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.18, ease }} className="scroll-mt-24 rounded-[2rem] bg-white p-2 text-[#0b1930] shadow-[0_35px_90px_rgba(0,20,77,.28)] xl:p-3">
            <div className="rounded-[1.6rem] border border-[#e4ebf4] bg-white p-2 sm:p-3"><WaitlistForm /></div>
          </motion.div>
        </div>
      </section>

      <section aria-labelledby="audiences-title" className="relative bg-[#f7faff] px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-10 max-w-2xl text-center"><p className="text-xs font-bold uppercase tracking-[.22em] text-[#0866ff]">Deux façons de participer</p><h2 id="audiences-title" className="mt-3 text-balance text-3xl font-bold tracking-[-.04em] sm:text-4xl">Une communauté, deux parcours.</h2></div>
          <div className="grid gap-5 lg:grid-cols-2">
            <motion.article initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="group relative min-h-[27rem] overflow-hidden rounded-[2rem] border border-[#dce7f3] bg-white shadow-[0_24px_65px_rgba(32,66,103,.1)]">
              <div className="relative z-20 max-w-full p-6 sm:max-w-[44%] sm:p-8"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eaf3ff] text-[#0866ff]"><UsersRound /></span><p className="mt-7 text-xs font-bold uppercase tracking-[.2em] text-[#0866ff]">Pour les clients</p><h3 className="mt-3 text-[1.8rem] font-bold leading-[1.12] tracking-[-.035em] 2xl:text-3xl">Trouvez la bonne personne pour vous aider.</h3><div className="mt-6 space-y-3 text-sm font-semibold text-[#536277]">{['Profils faciles à comprendre', 'Helpers locaux', 'Choix qui vous appartient'].map((item) => <p key={item} className="flex items-center gap-2"><Check className="h-4 w-4 text-[#0866ff]" />{item}</p>)}</div></div>
              <img src="/brand/landing-client-card.png" alt="Référence visuelle officielle du parcours client Link Help" className="absolute inset-y-0 right-0 z-10 hidden h-full w-[60%] object-cover object-center transition duration-500 group-hover:scale-[1.03] sm:block" loading="lazy" />
            </motion.article>

            <motion.article initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.08 }} className="group relative min-h-[27rem] overflow-hidden rounded-[2rem] bg-[#0b1930] text-white shadow-[0_28px_70px_rgba(11,25,48,.2)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_90%_15%,rgba(8,102,255,.42),transparent_45%)]" />
              <div className="relative z-10 max-w-full p-6 sm:max-w-[44%] sm:p-8"><span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-[#7eb3ff]"><BadgeCheck /></span><p className="mt-7 text-xs font-bold uppercase tracking-[.2em] text-[#7eb3ff]">Pour les helpers</p><h3 className="mt-3 text-[1.8rem] font-bold leading-[1.12] tracking-[-.035em] 2xl:text-3xl">Faites reconnaître votre savoir-faire.</h3><div className="mt-6 space-y-3 text-sm font-semibold text-white/68">{['Opportunités locales', 'Profil et progression', 'Expérience pensée mobile'].map((item) => <p key={item} className="flex items-center gap-2"><Check className="h-4 w-4 text-[#7eb3ff]" />{item}</p>)}</div></div>
              <img src="/brand/landing-helper-card.png" alt="Référence visuelle officielle du parcours helper Link Help" className="absolute inset-y-0 right-0 hidden h-full w-[56%] sm:block object-cover object-center transition duration-500 group-hover:scale-[1.03] sm:right-0" loading="lazy" />
            </motion.article>
          </div>
        </div>
      </section>
    </>
  );
}
