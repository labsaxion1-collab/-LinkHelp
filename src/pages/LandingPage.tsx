import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  Brush,
  Clock3,
  Flower2,
  Hammer,
  LockKeyhole,
  PackageCheck,
  PlugZap,
  ShieldCheck,
  Sparkles,
  Truck,
  UsersRound,
} from 'lucide-react';
import { LogoIcon } from '@/components/ui/Logo';
import { ByFluxBadge } from '@/components/brand/ByFluxBadge';
import { ROUTES } from '@/utils/constants';
import { useLanguage } from '@/context/LanguageContext';

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
};

function FuturisticBackground() {
  const { scrollYProgress } = useScroll();
  const nearLogoY = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const farGlowY = useTransform(scrollYProgress, [0, 1], [0, -110]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        aria-hidden
        style={{ y: nearLogoY }}
        className="absolute -left-[14rem] -top-[11rem] h-[42rem] w-[42rem] rounded-full bg-[radial-gradient(circle,rgba(125,211,252,0.34)_0%,rgba(51,182,255,0.18)_30%,rgba(22,119,255,0.08)_48%,transparent_72%)] blur-2xl"
      />
      <motion.div
        aria-hidden
        style={{ y: farGlowY }}
        className="absolute left-[18%] top-[6rem] h-[34rem] w-[55rem] rounded-full bg-[radial-gradient(circle,rgba(22,119,255,0.16)_0%,rgba(7,17,32,0.08)_42%,transparent_72%)] blur-3xl"
      />
      <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(12,38,72,0.36)_0%,rgba(7,17,32,0.44)_30%,rgba(5,8,22,0.76)_72%,rgba(5,8,22,0.9)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_11%_17%,rgba(226,246,255,0.20),transparent_17%),radial-gradient(circle_at_18%_28%,rgba(51,182,255,0.13),transparent_24%)]" />
      {Array.from({ length: 16 }).map((_, index) => (
        <motion.span
          key={index}
          className="absolute rounded-[1rem] border border-[#33B6FF]/25 bg-[#1677FF]/[0.04] shadow-[0_0_32px_rgba(22,119,255,0.28)] backdrop-blur-sm"
          style={{
            left: `${(index * 17) % 100}%`,
            top: `${12 + ((index * 23) % 78)}%`,
            width: `${18 + (index % 4) * 12}px`,
            height: `${18 + (index % 4) * 12}px`,
          }}
          animate={{ y: [-10, 14, -10], rotate: [0, 12, 0], opacity: [0.18, 0.58, 0.18] }}
          transition={{ duration: 6 + index * 0.35, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
      <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.16)_1px,transparent_1px)] [background-size:38px_38px] opacity-[0.06]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(5,8,22,0.62)_42%,#050816_100%)]" />
    </div>
  );
}

function GlassCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -8, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 220, damping: 22 }}
      className={`group relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.055] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.32)] backdrop-blur-2xl ${className}`}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#33B6FF]/70 to-transparent" />
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[#1677FF]/20 blur-3xl transition-opacity group-hover:opacity-100" />
      {children}
    </motion.div>
  );
}

function SectionHeading({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
      className="mx-auto mb-12 max-w-3xl text-center"
    >
      <p className="mb-4 text-xs font-bold uppercase tracking-[0.32em] text-[#33B6FF]">{eyebrow}</p>
      <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl">{title}</h2>
      <p className="mx-auto mt-4 max-w-2xl text-base font-medium leading-8 text-[#C7D2FE]/80 sm:text-lg">{body}</p>
    </motion.div>
  );
}

export default function LandingPage() {
  const { t } = useLanguage();
  const clientSignup = `${ROUTES.signup}?role=client`;
  const helperSignup = `${ROUTES.signup}?role=helper`;
  const howItWorks = [
    {
      title: t('landing.premium_how_request_title'),
      body: t('landing.premium_how_request_body'),
      icon: UsersRound,
    },
    {
      title: t('landing.premium_how_opportunities_title'),
      body: t('landing.premium_how_opportunities_body'),
      icon: Sparkles,
    },
    {
      title: t('landing.premium_how_earn_title'),
      body: t('landing.premium_how_earn_body'),
      icon: Banknote,
    },
  ];
  const services = [
    { title: t('landing.service_electrician'), icon: PlugZap, meta: t('landing.service_verified_pros') },
    { title: t('landing.card_cleaning'), icon: Sparkles, meta: t('landing.service_home_office') },
    { title: t('landing.service_gardening'), icon: Flower2, meta: t('landing.service_outdoor_care') },
    { title: t('landing.service_delivery'), icon: Truck, meta: t('landing.service_fast_runs') },
    { title: t('landing.service_nails'), icon: Brush, meta: t('landing.service_beauty_home') },
    { title: t('landing.card_assembly'), icon: Hammer, meta: t('landing.service_setup_easy') },
  ];
  const benefits = [
    { title: t('landing.trust_payments_title'), value: t('landing.benefit_protected'), icon: LockKeyhole },
    { title: t('landing.benefit_fast_service'), value: t('landing.benefit_fast_value'), icon: Clock3 },
    { title: t('landing.benefit_trusted_connections'), value: t('landing.reviews_score'), icon: ShieldCheck },
    { title: t('landing.benefit_real_opportunities'), value: '50k+', icon: PackageCheck },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent text-white">
      <FuturisticBackground />

      <main className="relative z-10">
        <section className="relative flex min-h-[calc(100vh-64px)] items-center px-4 pb-20 pt-16 sm:px-6 lg:px-8">
          <div className="pointer-events-none absolute left-1/2 top-14 h-72 w-[44rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(226,246,255,0.28)_0%,rgba(51,182,255,0.18)_28%,rgba(22,119,255,0.08)_52%,transparent_76%)] blur-2xl" />
          <motion.div
            aria-hidden
            className="pointer-events-none absolute left-[28%] top-24 h-48 w-48 rounded-full border border-[#9BE7FF]/20 shadow-[0_0_70px_rgba(51,182,255,0.24)]"
            animate={{ scale: [0.96, 1.06, 0.96], opacity: [0.18, 0.42, 0.18] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-[1.02fr_0.98fr]">
            <motion.div
              initial="hidden"
              animate="visible"
              transition={{ staggerChildren: 0.12 }}
              className="mx-auto max-w-3xl text-center lg:mx-0 lg:text-left"
            >
              <motion.div
                variants={fadeUp}
                className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#33B6FF]/25 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-[#C7D2FE] shadow-[0_0_40px_rgba(22,119,255,0.18)] backdrop-blur-xl"
              >
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00D4FF] opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#00D4FF]" />
                </span>
                {t('landing.premium_badge')}
              </motion.div>

              <motion.div variants={fadeUp} className="mb-8 flex justify-center lg:justify-start">
                <motion.div
                  animate={{ y: [0, -8, 0], filter: ['drop-shadow(0 0 18px rgba(22,119,255,0.35))', 'drop-shadow(0 0 34px rgba(51,182,255,0.58))', 'drop-shadow(0 0 18px rgba(22,119,255,0.35))'] }}
                  transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                  className="relative flex items-center gap-4"
                >
                  <div className="absolute -inset-9 rounded-[2.5rem] bg-[radial-gradient(circle_at_23%_48%,rgba(255,255,255,0.40),rgba(155,231,255,0.24)_30%,rgba(51,182,255,0.12)_50%,transparent_74%)] blur-xl" />
                  <LogoIcon className="relative h-16 w-16 opacity-90 sm:h-20 sm:w-20" />
                  <div>
                    <p className="text-4xl font-extrabold tracking-tight sm:text-6xl">
                      Link<span className="bg-gradient-to-r from-[#33B6FF] to-[#1677FF] bg-clip-text text-transparent">Help</span>
                    </p>
                    <p className="mt-2 text-xs font-bold uppercase tracking-[0.28em] text-[#33B6FF]">{t('landing.brand_tagline')}</p>
                    <div className="mt-2">
                      <ByFluxBadge className="text-cyan-200/45" />
                    </div>
                  </div>
                </motion.div>
              </motion.div>

              <motion.h1
                variants={fadeUp}
                className="text-balance text-5xl font-extrabold leading-[0.98] tracking-tight text-white sm:text-7xl lg:text-8xl"
              >
                {t('landing.premium_hero_title')}
              </motion.h1>
              <motion.p variants={fadeUp} className="mx-auto mt-7 max-w-2xl text-lg font-medium leading-8 text-[#C7D2FE]/82 sm:text-xl lg:mx-0">
                {t('landing.premium_hero_sub')}
              </motion.p>

              <motion.div variants={fadeUp} className="mt-10 flex flex-col justify-center gap-4 sm:flex-row lg:justify-start">
                <Link
                  to={clientSignup}
                  className="group inline-flex min-h-[56px] items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#1677FF] to-[#00D4FF] px-7 text-base font-extrabold text-white shadow-[0_18px_55px_rgba(22,119,255,0.42)] transition-all hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(0,212,255,0.36)]"
                >
                  {t('landing.premium_cta_start')}
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
                <a
                  href="#services"
                  className="inline-flex min-h-[56px] items-center justify-center rounded-2xl border border-white/14 bg-white/[0.055] px-7 text-base font-extrabold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-xl transition-all hover:-translate-y-1 hover:border-[#33B6FF]/50 hover:bg-white/[0.09]"
                >
                  {t('landing.premium_cta_explore')}
                </a>
              </motion.div>

              <motion.div variants={fadeUp} className="mt-10 grid grid-cols-3 gap-3 text-left sm:max-w-xl">
                {[
                  ['50k+', t('landing.stat_connected_users')],
                  [t('landing.reviews_score'), t('landing.stat_average_rating')],
                  ['24/7', t('landing.stat_live_requests')],
                ].map(([value, label]) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 backdrop-blur-xl">
                    <p className="text-2xl font-extrabold text-white">{value}</p>
                    <p className="mt-1 text-xs font-semibold text-[#C7D2FE]/70">{label}</p>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 40, rotateX: 8 }}
              animate={{ opacity: 1, x: 0, rotateX: 0 }}
              transition={{ duration: 0.9, ease: 'easeOut', delay: 0.2 }}
              className="relative mx-auto w-full max-w-xl lg:max-w-none"
            >
              <div className="absolute -inset-8 rounded-[3rem] bg-[#1677FF]/20 blur-3xl" />
              <motion.div
                animate={{ y: [0, -16, 0], rotate: [0, 0.8, 0] }}
                transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
                className="relative min-h-[520px] overflow-hidden rounded-[2rem] border border-white/12 bg-[#071120]/70 p-6 shadow-[0_34px_120px_rgba(0,0,0,0.45)] backdrop-blur-2xl"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(51,182,255,0.22),transparent_32%),linear-gradient(135deg,rgba(22,119,255,0.14),transparent_44%)]" />
                <div className="absolute left-8 top-8 h-40 w-40 rounded-full border border-[#33B6FF]/30 shadow-[0_0_60px_rgba(51,182,255,0.2)]" />
                <div className="absolute right-10 top-20 h-24 w-24 rounded-[2rem] border border-[#00D4FF]/25 bg-white/[0.035] blur-[0.2px]" />
                <div className="absolute bottom-16 right-8 h-56 w-56 rounded-full bg-[#1677FF]/14 blur-3xl" />
                <div className="relative mx-auto flex h-full max-w-sm flex-col rounded-[2rem] border border-white/12 bg-[#050816]/74 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_30px_90px_rgba(0,0,0,0.38)] backdrop-blur-2xl">
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-white">{t('landing.demo_hello')}</p>
                      <p className="text-xs font-medium text-[#C7D2FE]/60">{t('landing.demo_ready')}</p>
                    </div>
                    <div className="h-9 w-9 rounded-2xl border border-white/10 bg-white/[0.06]" />
                  </div>

                  <div className="rounded-3xl border border-[#33B6FF]/25 bg-gradient-to-br from-[#1677FF]/26 to-white/[0.035] p-5 shadow-[0_0_50px_rgba(22,119,255,0.18)]">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#33B6FF]">{t('landing.demo_balance')}</p>
                    <p className="mt-3 text-4xl font-extrabold text-white">$2,540</p>
                    <div className="mt-5 h-2 rounded-full bg-white/10">
                      <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-[#1677FF] to-[#00D4FF]" />
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-4 gap-3">
                    {[UsersRound, Sparkles, PackageCheck, Banknote].map((Icon, index) => (
                      <div key={index} className="flex aspect-square items-center justify-center rounded-2xl border border-white/10 bg-white/[0.055] text-[#33B6FF]">
                        <Icon className="h-5 w-5" />
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 space-y-3">
                    {[
                      [t('landing.demo_delivery_request'), '+ $45.00'],
                      [t('landing.demo_cleaning_service'), '+ $120.00'],
                      [t('landing.demo_assembly_task'), '+ $85.00'],
                    ].map(([title, value]) => (
                      <div key={title} className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.045] px-4 py-3">
                        <div>
                          <p className="text-sm font-bold text-white">{title}</p>
                          <p className="text-xs font-semibold text-[#C7D2FE]/50">{t('landing.demo_live_opportunity')}</p>
                        </div>
                        <p className="text-sm font-extrabold text-[#00D4FF]">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="absolute bottom-7 left-7 right-7 rounded-3xl border border-white/12 bg-[#050816]/72 p-5 backdrop-blur-xl">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#33B6FF]">{t('landing.demo_marketplace')}</p>
                      <p className="mt-1 text-xl font-extrabold text-white">{t('landing.demo_near_you')}</p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1677FF] shadow-[0_0_30px_rgba(22,119,255,0.55)]">
                      <Sparkles className="h-6 w-6" />
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        <section className="relative px-4 py-20 sm:px-6 lg:px-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(22,119,255,0.18),transparent_38%)]" />
          <div className="relative mx-auto max-w-7xl">
            <SectionHeading
              eyebrow={t('landing.premium_how_eyebrow')}
              title={t('landing.premium_how_title')}
              body={t('landing.premium_how_body')}
            />
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              transition={{ staggerChildren: 0.12 }}
              className="grid gap-5 md:grid-cols-3"
            >
              {howItWorks.map((item, index) => {
                const Icon = item.icon;
                return (
                  <GlassCard key={item.title}>
                    <div className="mb-8 flex items-center justify-between">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1677FF] to-[#00D4FF] text-white shadow-[0_0_42px_rgba(22,119,255,0.44)]">
                        <Icon className="h-7 w-7" />
                      </div>
                      <span className="text-sm font-extrabold text-white/20">0{index + 1}</span>
                    </div>
                    <h3 className="text-2xl font-extrabold text-white">{item.title}</h3>
                    <p className="mt-4 text-sm font-medium leading-7 text-[#C7D2FE]/76">{item.body}</p>
                  </GlassCard>
                );
              })}
            </motion.div>
          </div>
        </section>

        <section id="services" className="relative px-4 py-20 sm:px-6 lg:px-8">
          <div className="absolute inset-x-0 top-0 h-full bg-[radial-gradient(circle_at_78%_10%,rgba(51,182,255,0.12),transparent_32%),linear-gradient(180deg,transparent,rgba(7,17,32,0.28),transparent)]" />
          <div className="relative mx-auto max-w-7xl">
            <SectionHeading
              eyebrow={t('landing.premium_services_eyebrow')}
              title={t('landing.premium_services_title')}
              body={t('landing.premium_services_body')}
            />
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              transition={{ staggerChildren: 0.08 }}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {services.map((service) => {
                const Icon = service.icon;
                return (
                  <Link key={service.title} to={clientSignup} className="block focus:outline-none focus:ring-2 focus:ring-[#33B6FF]/60 rounded-[1.75rem]">
                    <GlassCard className="min-h-[190px]">
                    <div className="flex h-full flex-col justify-between">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#33B6FF]/20 bg-[#1677FF]/14 text-[#33B6FF] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                          <Icon className="h-6 w-6" />
                        </div>
                        <ArrowRight className="h-5 w-5 text-white/24 transition-all group-hover:translate-x-1 group-hover:text-[#33B6FF]" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-extrabold text-white">{service.title}</h3>
                        <p className="mt-2 text-sm font-semibold text-[#C7D2FE]/70">{service.meta}</p>
                      </div>
                    </div>
                    </GlassCard>
                  </Link>
                );
              })}
            </motion.div>
          </div>
        </section>

        <section className="relative px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow={t('landing.premium_benefits_eyebrow')}
              title={t('landing.premium_benefits_title')}
              body={t('landing.premium_benefits_body')}
            />
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              transition={{ staggerChildren: 0.08 }}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              {benefits.map((benefit) => {
                const Icon = benefit.icon;
                return (
                  <GlassCard key={benefit.title} className="p-5">
                    <div className="flex items-center gap-4 lg:flex-col lg:items-start">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#0A1A35] text-[#33B6FF] shadow-[0_0_34px_rgba(51,182,255,0.2)] ring-1 ring-white/10">
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-2xl font-extrabold text-white">{benefit.value}</p>
                        <p className="text-sm font-semibold text-[#C7D2FE]/72">{benefit.title}</p>
                      </div>
                    </div>
                  </GlassCard>
                );
              })}
            </motion.div>
          </div>
        </section>

        <section className="relative px-4 py-24 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 34 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.25rem] border border-[#33B6FF]/20 bg-[#071120]/78 px-6 py-16 text-center shadow-[0_0_120px_rgba(22,119,255,0.22)] backdrop-blur-2xl sm:px-12"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(226,246,255,0.18),transparent_22%),radial-gradient(circle_at_50%_18%,rgba(0,212,255,0.20),transparent_36%),linear-gradient(180deg,rgba(7,17,32,0.58),rgba(5,8,22,0.94))]" />
            <div className="relative mx-auto max-w-3xl">
              <div className="mx-auto mb-7 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-[#1677FF] to-[#00D4FF] shadow-[0_0_50px_rgba(0,212,255,0.45)]">
                <BadgeCheck className="h-8 w-8" />
              </div>
              <h2 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl">{t('landing.premium_final_title')}</h2>
              <p className="mx-auto mt-6 max-w-2xl text-lg font-medium leading-8 text-[#C7D2FE]/82">
                {t('landing.premium_final_body')}
              </p>
              <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
                <Link
                  to={helperSignup}
                  className="inline-flex min-h-[56px] items-center justify-center gap-3 rounded-2xl bg-white px-7 text-base font-extrabold text-[#071120] shadow-[0_18px_60px_rgba(255,255,255,0.2)] transition-all hover:-translate-y-1"
                >
                  {t('landing.premium_cta_start')}
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  to={ROUTES.login}
                  className="inline-flex min-h-[56px] items-center justify-center rounded-2xl border border-white/18 bg-white/[0.06] px-7 text-base font-extrabold text-white backdrop-blur-xl transition-all hover:-translate-y-1 hover:bg-white/[0.1]"
                >
                  {t('login_page.submit')}
                </Link>
              </div>
            </div>
          </motion.div>
        </section>
      </main>
    </div>
  );
}
