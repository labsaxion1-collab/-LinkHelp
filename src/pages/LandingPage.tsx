import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { motion } from 'motion/react';
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

function LightBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Base gradient — off-white to soft blue */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#EEF4FF] via-[#F5F8FF] to-[#E8F0FE]" />
      {/* Radial blue glow top-left */}
      <div className="absolute -left-32 -top-20 h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,rgba(37,99,255,0.12)_0%,transparent_65%)] blur-3xl" />
      {/* Radial cyan glow top-right */}
      <div className="absolute -right-24 top-0 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.10)_0%,transparent_60%)] blur-3xl" />
      {/* Subtle dot grid */}
      <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(37,99,255,0.08)_1px,transparent_1px)] [background-size:32px_32px] opacity-60" />
      {/* Gentle fade-to-white at the very bottom so sections below blend smoothly */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white to-transparent" />
    </div>
  );
}

function GlassCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -6, scale: 1.005 }}
      transition={{ type: 'spring', stiffness: 220, damping: 22 }}
      className={`group relative overflow-hidden rounded-[1.75rem] border border-[rgba(15,23,42,0.08)] bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,0.06)] ${className}`}
    >
      <div className="absolute inset-x-0 top-0 h-[3px] rounded-t-[1.75rem] bg-gradient-to-r from-transparent via-[#2563FF]/40 to-transparent" />
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[#2563FF]/06 blur-3xl transition-all duration-300 group-hover:bg-[#2563FF]/10" />
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
      className="mx-auto mb-10 max-w-3xl text-center sm:mb-12"
    >
      <p className="mb-4 text-xs font-bold uppercase tracking-[0.32em] text-[#2563FF]">{eyebrow}</p>
      <h2 className="text-2xl font-extrabold tracking-tight text-[#0B1220] sm:text-5xl">{title}</h2>
      <p className="mx-auto mt-4 max-w-2xl text-base font-medium leading-8 text-[#4B5563] sm:text-lg">{body}</p>
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
    <div className="relative min-h-screen overflow-hidden bg-[#EEF4FF] text-[#0B1220]">
      <LightBackground />

      <main className="relative z-10">
        {/* ─── HERO ─── */}
        <section className="relative flex min-h-[calc(100vh-64px)] items-center overflow-hidden px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-16 lg:px-8">

          <div className="mx-auto grid w-full max-w-7xl items-center gap-8 lg:grid-cols-[1fr_1fr] lg:gap-12">

            {/* ── Left: text ── */}
            <motion.div
              initial="hidden"
              animate="visible"
              transition={{ staggerChildren: 0.11 }}
              className="mx-auto max-w-2xl text-center lg:mx-0 lg:text-left"
            >
              {/* Live badge */}
              <motion.div
                variants={fadeUp}
                className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#2563FF]/20 bg-white px-4 py-2 text-sm font-semibold text-[#2563FF] shadow-[0_4px_18px_rgba(37,99,255,0.10)]"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2563FF] opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#2563FF]" />
                </span>
                {t('landing.premium_badge')}
              </motion.div>

              {/* Logo + brand */}
              <motion.div variants={fadeUp} className="mb-7 flex justify-center lg:justify-start">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-[1.25rem] border border-blue-100 bg-white shadow-[0_8px_28px_rgba(37,99,255,0.14)]">
                    <LogoIcon className="h-9 w-9" />
                  </div>
                  <div>
                    <p className="text-2xl font-extrabold tracking-tight text-[#0B1220]">
                      Link<span className="bg-gradient-to-r from-[#2563FF] to-[#38BDF8] bg-clip-text text-transparent">Help</span>
                    </p>
                    <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.26em] text-[#2563FF]/70">{t('landing.brand_tagline')}</p>
                  </div>
                </div>
              </motion.div>

              {/* Heading */}
              <motion.h1
                variants={fadeUp}
                className="text-balance text-[2.4rem] font-extrabold leading-[1.06] tracking-tight text-[#0B1220] sm:text-5xl lg:text-6xl"
              >
                {t('landing.premium_hero_title')}
              </motion.h1>

              {/* Subheading */}
              <motion.p
                variants={fadeUp}
                className="mx-auto mt-5 max-w-xl text-base font-medium leading-7 text-[#4B5563] sm:text-lg lg:mx-0"
              >
                {t('landing.premium_hero_sub')}
              </motion.p>

              {/* Trust badges */}
              <motion.div variants={fadeUp} className="mt-6 flex flex-wrap justify-center gap-3 lg:justify-start">
                {[
                  { icon: ShieldCheck, label: t('landing.trust_verified_title') },
                  { icon: BadgeCheck,  label: t('landing.trust_reviews_title') },
                ].map(({ icon: Icon, label }) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-white px-4 py-2 text-[13px] font-semibold text-[#0B1220] shadow-[0_2px_10px_rgba(15,23,42,0.06)]"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-[#2563FF]" />
                    {label}
                  </span>
                ))}
              </motion.div>

              {/* CTAs */}
              <motion.div variants={fadeUp} className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
                <Link
                  to={clientSignup}
                  className="group inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-br from-[#2563FF] to-[#1D55E8] px-7 text-[15px] font-extrabold text-white shadow-[0_12px_36px_rgba(37,99,255,0.30)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_44px_rgba(37,99,255,0.36)]"
                >
                  {t('landing.premium_cta_start')}
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
                <a
                  href="#services"
                  className="inline-flex min-h-[52px] items-center justify-center rounded-2xl border border-[rgba(15,23,42,0.10)] bg-white px-7 text-[15px] font-extrabold text-[#0B1220] shadow-[0_4px_16px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-0.5 hover:border-[#2563FF]/30 hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
                >
                  {t('landing.premium_cta_explore')}
                </a>
              </motion.div>

              {/* Stats */}
              <motion.div variants={fadeUp} className="mt-8 grid grid-cols-3 gap-3 sm:max-w-md">
                {[
                  ['50k+', t('landing.stat_connected_users')],
                  [t('landing.reviews_score'), t('landing.stat_average_rating')],
                  ['24/7', t('landing.stat_live_requests')],
                ].map(([value, label]) => (
                  <div key={label} className="rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white p-4 shadow-[0_2px_10px_rgba(15,23,42,0.05)]">
                    <p className="text-xl font-extrabold text-[#0B1220] sm:text-2xl">{value}</p>
                    <p className="mt-0.5 text-[11px] font-semibold text-[#6B7280]">{label}</p>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            {/* ── Right: hero tools image ── */}
            <motion.div
              initial={{ opacity: 0, x: 40, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.9, ease: 'easeOut', delay: 0.15 }}
              className="relative mx-auto w-full max-w-[480px] lg:max-w-none"
            >
              {/* Glow behind image */}
              <div className="pointer-events-none absolute inset-y-8 left-1/2 w-[85%] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(37,99,255,0.14),transparent_68%)] blur-2xl" aria-hidden />

              <motion.img
                src="/brand/hero-tools.png"
                alt="Ferramentas de serviços"
                className="relative w-full drop-shadow-2xl"
                style={{ filter: 'drop-shadow(0 32px 56px rgba(15,23,42,0.16))' }}
                animate={{ y: [0, -14, 0] }}
                transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut' }}
                loading="eager"
                decoding="async"
              />

              {/* Floating badge — Profissionais verificados */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.6 }}
                className="absolute -left-4 bottom-[22%] flex items-center gap-2.5 rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white px-4 py-3 shadow-[0_12px_36px_rgba(15,23,42,0.12)] sm:-left-8"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                  <ShieldCheck className="h-5 w-5 text-[#2563FF]" />
                </span>
                <div>
                  <p className="text-[13px] font-extrabold text-[#0B1220]">{t('landing.trust_verified_title')}</p>
                  <p className="text-[11px] font-medium text-[#6B7280]">50k+ {t('landing.stat_connected_users')}</p>
                </div>
              </motion.div>

              {/* Floating badge — top-right: avaliações */}
              <motion.div
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.6 }}
                className="absolute -right-2 top-[12%] flex items-center gap-2 rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white px-4 py-3 shadow-[0_12px_36px_rgba(15,23,42,0.12)] sm:-right-6"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50">
                  <BadgeCheck className="h-5 w-5 text-amber-500" />
                </span>
                <div>
                  <p className="text-[13px] font-extrabold text-[#0B1220]">{t('landing.trust_reviews_title')}</p>
                  <p className="text-[11px] font-medium text-[#6B7280]">{t('landing.reviews_score')} ★</p>
                </div>
              </motion.div>
            </motion.div>

          </div>
        </section>

        {/* ─── HOW IT WORKS ─── */}
        <section className="relative bg-white px-4 py-20 sm:px-6 lg:px-8">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#2563FF]/20 to-transparent" />
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
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563FF] to-[#38BDF8] text-white shadow-[0_8px_28px_rgba(37,99,255,0.24)]">
                        <Icon className="h-7 w-7" />
                      </div>
                      <span className="text-3xl font-extrabold text-[#0B1220]/08">0{index + 1}</span>
                    </div>
                    <h3 className="text-xl font-extrabold text-[#0B1220] sm:text-2xl">{item.title}</h3>
                    <p className="mt-4 text-sm font-medium leading-7 text-[#4B5563]">{item.body}</p>
                  </GlassCard>
                );
              })}
            </motion.div>
          </div>
        </section>

        {/* ─── SERVICES ─── */}
        <section id="services" className="relative bg-[#F5F8FF] px-4 py-20 sm:px-6 lg:px-8">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#2563FF]/15 to-transparent" />
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
                  <Link key={service.title} to={clientSignup} className="block rounded-[1.75rem] focus:outline-none focus:ring-2 focus:ring-[#2563FF]/40">
                    <GlassCard className="min-h-[190px]">
                      <div className="flex h-full flex-col justify-between">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-[#2563FF]">
                            <Icon className="h-6 w-6" />
                          </div>
                          <ArrowRight className="h-5 w-5 text-[#0B1220]/25 transition-all group-hover:translate-x-1 group-hover:text-[#2563FF]" />
                        </div>
                        <div>
                          <h3 className="text-xl font-extrabold text-[#0B1220] sm:text-2xl">{service.title}</h3>
                          <p className="mt-2 text-sm font-semibold text-[#6B7280]">{service.meta}</p>
                        </div>
                      </div>
                    </GlassCard>
                  </Link>
                );
              })}
            </motion.div>
          </div>
        </section>

        {/* ─── BENEFITS ─── */}
        <section className="relative bg-white px-4 py-20 sm:px-6 lg:px-8">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#2563FF]/15 to-transparent" />
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
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-[#2563FF] shadow-[0_4px_16px_rgba(37,99,255,0.10)]">
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-xl font-extrabold text-[#0B1220] sm:text-2xl">{benefit.value}</p>
                        <p className="text-sm font-semibold text-[#6B7280]">{benefit.title}</p>
                      </div>
                    </div>
                  </GlassCard>
                );
              })}
            </motion.div>
          </div>
        </section>

        {/* ─── FINAL CTA ─── */}
        <section className="relative bg-[#F5F8FF] px-4 py-24 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 34 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#1447E6] to-[#0B2FA8] px-4 py-14 text-center shadow-[0_24px_80px_rgba(37,99,255,0.30)] sm:rounded-[2.5rem] sm:px-12 sm:py-20"
          >
            {/* inner glow */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.16),transparent_50%),radial-gradient(ellipse_at_80%_100%,rgba(56,189,248,0.18),transparent_48%)]" />
            <div className="relative mx-auto max-w-3xl">
              <div className="mx-auto mb-7 flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-white/15 text-white shadow-[0_0_40px_rgba(255,255,255,0.2)] ring-1 ring-white/20">
                <BadgeCheck className="h-8 w-8" />
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-6xl">{t('landing.premium_final_title')}</h2>
              <p className="mx-auto mt-6 max-w-2xl text-lg font-medium leading-8 text-white/80">
                {t('landing.premium_final_body')}
              </p>
              <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
                <Link
                  to={helperSignup}
                  className="inline-flex min-h-[54px] items-center justify-center gap-2.5 rounded-2xl bg-white px-7 text-center text-base font-extrabold text-[#1447E6] shadow-[0_12px_40px_rgba(0,0,0,0.20)] transition-all hover:-translate-y-1 hover:shadow-[0_16px_50px_rgba(0,0,0,0.26)]"
                >
                  {t('landing.premium_cta_start')}
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  to={ROUTES.login}
                  className="inline-flex min-h-[54px] items-center justify-center rounded-2xl border border-white/25 bg-white/10 px-7 text-center text-base font-extrabold text-white transition-all hover:-translate-y-1 hover:bg-white/16"
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
