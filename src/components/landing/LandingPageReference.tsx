import { useEffect, useState } from 'react';
import { MotionConfig, motion, useReducedMotion } from 'motion/react';
import { ArrowRight, ChevronDown, Menu, X } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { ByFluxBadge } from '@/components/brand/ByFluxBadge';
import { LandingHeroShowcase } from './LandingHeroShowcase';
import { WaitlistForm } from './WaitlistForm';
import { faqs, landingServices } from './landingData';
import helperNewMedal from '@/assets/hero/medals/helper/novo helper.png';
import helperBeginnerMedal from '@/assets/hero/medals/helper/iniciante.png';
import helperProfessionalMedal from '@/assets/hero/medals/helper/profissional.png';
import helperEliteMedal from '@/assets/hero/medals/helper/elite.png';
import helperTopMedal from '@/assets/hero/medals/helper/top.png';
import helperLegendMedal from '@/assets/hero/medals/helper/lenda.png';
import clientNewMedal from '@/assets/hero/medals/client/novo cliente.png';
import clientTrustedMedal from '@/assets/hero/medals/client/confiavel.png';
import clientGoldMedal from '@/assets/hero/medals/client/ouro.png';
import clientVipMedal from '@/assets/hero/medals/client/vip.png';
import clientEliteMedal from '@/assets/hero/medals/client/elite.png';

const reveal = { initial: { opacity: 0, y: 22 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-60px' }, transition: { duration: 0.6 } };

function Navbar() {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    let lastScrollY = window.scrollY;
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollY;
      if (currentScrollY <= 16) {
        setVisible(true);
        lastScrollY = currentScrollY;
      } else if (delta > 4) {
        setVisible(false);
        setOpen(false);
        lastScrollY = currentScrollY;
      } else if (delta < -4) {
        setVisible(true);
        lastScrollY = currentScrollY;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const links = [['#audiences-title', 'Parcours'], ['#services', 'Services'], ['#faq', 'FAQ']] as const;
  return <motion.header initial={false} animate={{ y: visible ? 0 : '-100%' }} transition={{ duration: reduceMotion ? 0 : .28, ease: [0.22, 1, 0.36, 1] }} className="fixed inset-x-0 top-0 z-[100] border-b border-[#70a8f5]/45 bg-[linear-gradient(135deg,rgba(219,236,255,.84),rgba(137,185,247,.58))] shadow-[0_12px_38px_rgba(5,60,145,.18)] backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-[#a9cdf7]/55"><div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden"><motion.div className="absolute -inset-y-5 w-32 -skew-x-[24deg] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,.72),transparent)] blur-[2px]" initial={{ x: '-180%' }} animate={reduceMotion ? undefined : { x: ['-180%', '900%'] }} transition={reduceMotion ? undefined : { duration: 3.2, repeat: Infinity, repeatDelay: 2.4, ease: 'easeInOut' }} /></div><div aria-hidden="true" className="pointer-events-none absolute inset-x-[5%] -bottom-2 h-4 rounded-[50%] bg-[#073b88]/35 blur-[7px]" /><nav aria-label="Navigation principale" className="relative mx-auto flex h-16 max-w-[90rem] items-center justify-between px-5 sm:px-8"><a href="#accueil" aria-label="Link Help — accueil" className="inline-flex h-full items-center self-center rounded-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0866ff]/20"><Logo iconClassName="h-14 w-14 translate-y-[1px] drop-shadow-[0_7px_11px_rgba(4,46,112,.22)]" textClassName="text-xl" className="items-center gap-2" /></a><div className="hidden items-center gap-8 lg:flex">{links.map(([href, label]) => <a key={href} href={href} className="text-sm font-semibold text-[#25364d] transition hover:text-[#0866ff]">{label}</a>)}</div><a href="#liste" className="hidden min-h-11 items-center gap-2 rounded-xl bg-[#0866ff] px-5 text-sm font-bold text-white shadow-[0_12px_26px_rgba(8,102,255,.22)] lg:inline-flex">Rejoindre la liste <ArrowRight className="h-4 w-4" /></a><button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="reference-mobile-menu" aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'} className="relative z-20 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#cfddef]/90 bg-white/60 text-[#0b1930] shadow-sm backdrop-blur-xl transition hover:bg-white/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0866ff]/20 lg:hidden">{open ? <X className="h-6 w-6" /> : <Menu className="h-7 w-7" />}</button></nav>{open && <motion.div id="reference-mobile-menu" initial={{ opacity: 0, y: -10, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: .2 }} className="absolute inset-x-3 top-[calc(100%+.5rem)] z-[110] max-h-[calc(100vh-5rem)] overflow-y-auto rounded-[1.5rem] border border-white/70 bg-white/90 p-3 shadow-[0_28px_80px_rgba(4,28,73,.24)] backdrop-blur-2xl sm:inset-x-6 lg:hidden">{links.map(([href, label]) => <a key={href} href={href} onClick={() => setOpen(false)} className="block rounded-xl px-4 py-4 text-sm font-semibold text-[#25364d] transition hover:bg-[#edf5ff] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0866ff]/15">{label}</a>)}<a href="#liste" onClick={() => setOpen(false)} className="mt-2 flex min-h-12 items-center justify-center rounded-xl bg-[#0866ff] px-4 text-sm font-bold text-white shadow-[0_12px_28px_rgba(8,102,255,.22)]">Rejoindre la liste</a></motion.div>}</motion.header>;
}

function Section({ id, eyebrow, title, children, tinted = false }: { id?: string; eyebrow: string; title: string; children: React.ReactNode; tinted?: boolean }) {
  return <section id={id} className={`scroll-mt-24 px-5 py-20 sm:px-8 sm:py-24 ${tinted ? 'bg-[#f7faff]' : 'bg-white'}`}><div className="mx-auto max-w-7xl"><motion.div {...reveal} className="mx-auto mb-12 max-w-3xl text-center"><p className="text-xs font-bold uppercase tracking-[.22em] text-[#0866ff]">{eyebrow}</p><h2 className="mt-3 text-balance text-3xl font-bold tracking-[-.045em] text-[#0b1930] sm:text-5xl">{title}</h2></motion.div>{children}</div></section>;
}

function ServicesCarousel() {
  const reduceMotion = useReducedMotion();
  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);
  const pages = Array.from({ length: Math.ceil(landingServices.length / 4) }, (_, index) => landingServices.slice(index * 4, index * 4 + 4));

  useEffect(() => {
    if (reduceMotion || paused) return;
    const timer = window.setInterval(() => setPage((current) => (current + 1) % pages.length), 3800);
    return () => window.clearInterval(timer);
  }, [pages.length, paused, reduceMotion]);

  return <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={() => setPaused(false)} aria-roledescription="carrousel" aria-label="Catégories de services">
    <div className="overflow-hidden">
      <div className="flex transition-transform duration-700 ease-out" style={{ transform: `translateX(-${page * 100}%)` }}>
        {pages.map((services, pageIndex) => <div key={pageIndex} className="grid w-full shrink-0 grid-cols-2 gap-3" aria-hidden={pageIndex !== page}>{services.map(({ label, icon: Icon }) => <div key={label} className="flex min-h-36 flex-col items-center justify-center rounded-2xl border border-[#dfe7f1] bg-white p-4 text-center shadow-[0_10px_28px_rgba(32,66,103,.05)] sm:min-h-40"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eaf3ff] text-[#0866ff]"><Icon className="h-5 w-5" /></span><p className="mt-4 text-sm font-bold leading-5">{label}</p></div>)}</div>)}
      </div>
    </div>
    <div className="mt-5 flex justify-center gap-2" role="group" aria-label="Choisir une page de catégories">{pages.map((_, index) => <button key={index} type="button" onClick={() => setPage(index)} aria-label={`Page ${index + 1}`} aria-current={page === index ? 'true' : undefined} className={`h-2.5 rounded-full transition-all ${page === index ? 'w-8 bg-[#0866ff]' : 'w-2.5 bg-[#bfd0e4]'}`} />)}</div>
    <p className="mt-4 text-center text-xs leading-5 text-[#7b8ba1]">Les services réglementés seront offerts selon les qualifications requises et les règles applicables.</p>
  </div>;
}
const helperMedals = [
  { label: 'Nouveau helper', image: helperNewMedal },
  { label: 'Helper débutant', image: helperBeginnerMedal },
  { label: 'Helper professionnel', image: helperProfessionalMedal },
  { label: 'Helper élite', image: helperEliteMedal },
  { label: 'Top Helper', image: helperTopMedal },
  { label: 'Légende Link Help', image: helperLegendMedal },
];

const clientMedals = [
  { label: 'Nouveau client', image: clientNewMedal },
  { label: 'Client de confiance', image: clientTrustedMedal },
  { label: 'Client Or', image: clientGoldMedal },
  { label: 'Client VIP', image: clientVipMedal },
  { label: 'Client élite', image: clientEliteMedal },
];

function MedalMarquee({ title, medals, reverse = false }: { title: string; medals: { label: string; image: string }[]; reverse?: boolean }) {
  const reduceMotion = useReducedMotion();
  const repeatedMedals = [...medals, ...medals];
  return <article className="min-w-0 overflow-hidden py-1 sm:py-2">
    <h3 className="px-5 text-center text-sm font-bold uppercase tracking-[.18em] text-[#9ec6ff] sm:text-base">{title}</h3>
    <div className="relative mt-2.5 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
      <motion.div
        className="flex w-max gap-3 px-2 sm:gap-4"
        animate={reduceMotion ? undefined : { x: reverse ? ['-50%', '0%'] : ['0%', '-50%'] }}
        transition={reduceMotion ? undefined : { duration: reverse ? 24 : 28, repeat: Infinity, ease: 'linear' }}
      >
        {repeatedMedals.map((medal, index) => <div key={`${medal.label}-${index}`} className="flex w-28 shrink-0 flex-col items-center px-2 py-2 sm:w-32">
          <img src={medal.image} alt={index < medals.length ? `Médaille ${medal.label}` : ''} aria-hidden={index >= medals.length} className="h-20 w-20 object-contain drop-shadow-[0_12px_18px_rgba(0,0,0,.25)] sm:h-24 sm:w-24" loading="lazy" />
          <p className="-mt-4 text-center text-[11px] font-semibold leading-4 text-white/75 sm:-mt-5 sm:text-xs">{medal.label}</p>
        </div>)}
      </motion.div>
    </div>
  </article>;
}
export function LandingPageReference() {
  return <MotionConfig reducedMotion="user"><div className="min-h-screen overflow-x-hidden bg-white font-sans text-[#0b1930]"><Navbar /><div aria-hidden="true" className="h-16" /><main><LandingHeroShowcase />

    <Section id="services" eyebrow="Services du quotidien" title="Des services pour vous simplifier la vie." tinted><ServicesCarousel /></Section>


    <section className="relative isolate overflow-hidden bg-[#071f58] px-4 py-11 text-white sm:px-8 sm:py-14"><div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 opacity-70" style={{ backgroundImage: 'radial-gradient(115% 42% at 8% 28%, transparent 59%, rgba(45,126,255,.22) 60%, transparent 64%), radial-gradient(120% 46% at 92% 68%, transparent 57%, rgba(91,157,255,.18) 58%, transparent 63%), radial-gradient(circle at 78% 18%, rgba(50,127,245,.16), transparent 25%)' }} /><div className="mx-auto max-w-7xl"><motion.div {...reveal} className="mx-auto max-w-3xl text-center"><p className="text-xs font-bold uppercase tracking-[.22em] text-[#7eb3ff]">LinkCredits et progression</p><h2 className="mt-3 text-3xl font-bold tracking-[-.04em] sm:text-4xl">Les LinkCredits sont la monnaie de l’application.</h2><p className="mx-auto mt-3 max-w-2xl text-center leading-7 text-white/65">Ils accompagnent les échanges et les actions réalisées dans Link Help.</p><img src="/brand/linkcredit-pro-stack.webp" alt="Ensemble de pièces LinkCredit du plan Pro" className="mx-auto mt-2 h-24 w-40 object-contain drop-shadow-[0_14px_22px_rgba(0,0,0,.25)] sm:h-28 sm:w-48" loading="lazy" /><h2 className="mt-3 text-3xl font-bold tracking-[-.04em] sm:text-4xl">Votre réputation évolue avec vous.</h2><p className="mx-auto mt-3 max-w-2xl leading-7 text-white/65">Découvrez les médailles qui accompagnent chaque parcours Link Help.</p></motion.div><div className="mt-6 grid gap-3 sm:gap-4"><MedalMarquee title="Helpers" medals={helperMedals} reverse /><MedalMarquee title="Clients" medals={clientMedals} /></div></div></section>

    <Section id="faq" eyebrow="Questions fréquentes" title="Avant de rejoindre la liste." tinted><div className="mx-auto grid max-w-5xl gap-3 md:grid-cols-2">{faqs.map((faq) => <details key={faq.question} className="group rounded-2xl border border-[#dfe7f1] bg-white px-5 py-1"><summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 text-sm font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0866ff]/15">{faq.question}<ChevronDown className="h-4 w-4 shrink-0 text-[#0866ff] transition group-open:rotate-180" /></summary><p className="pb-5 text-sm leading-6 text-[#65758a]">{faq.answer}</p></details>)}</div></Section>

    <section className="px-5 py-16 sm:px-8 sm:py-20"><div className="mx-auto grid max-w-6xl items-center gap-8 rounded-[2.25rem] bg-[linear-gradient(135deg,#eaf3ff,#f8fbff)] p-7 sm:p-10 lg:grid-cols-[.8fr_1.2fr]"><div><p className="text-xs font-bold uppercase tracking-[.22em] text-[#0866ff]">Ne manquez rien du lancement</p><h2 className="mt-3 text-3xl font-bold tracking-[-.04em]">Soyez parmi les premiers.</h2><p className="mt-4 text-[#65758a]">Recevez les nouvelles importantes pour votre région.</p></div><WaitlistForm compact /></div></section>
  </main><footer className="border-t border-[#dfe7f1] bg-[#061b4a] px-5 py-10 text-white sm:px-8"><div className="mx-auto flex max-w-7xl flex-col gap-8 sm:flex-row sm:items-end sm:justify-between"><div><Logo className="h-9 w-auto brightness-0 invert" /><div className="mt-3"><ByFluxBadge className="text-white/45" /></div><p className="mt-4 text-sm text-white/55">L’aide locale, rendue plus simple.</p></div><div className="flex flex-wrap gap-5 text-sm font-semibold text-white/65"><a href="#audiences-title">Parcours</a><a href="#services">Services</a><a href="#faq">FAQ</a><a href="/contato">Contact</a></div></div></footer></div></MotionConfig>;
}
