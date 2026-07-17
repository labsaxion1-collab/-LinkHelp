import {
  BriefcaseBusiness,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Crown,
  DollarSign,
  FileText,
  Gem,
  Gift,
  Info,
  Lightbulb,
  MapPin,
  MessageCircle,
  Rocket,
  Search,
  Star,
  Tag,
  Trophy,
  Undo2,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import medalNovoHelper from '@/assets/hero/medals/helper/novo helper.png';
import medalIniciante from '@/assets/hero/medals/helper/iniciante.png';
import medalProfissional from '@/assets/hero/medals/helper/profissional.png';
import medalElite from '@/assets/hero/medals/helper/elite.png';
import medalTop from '@/assets/hero/medals/helper/top.png';
import medalLenda from '@/assets/hero/medals/helper/lenda.png';
import { BRAND } from '@/utils/brandAssets';
import { useLanguage } from '@/context/LanguageContext';

type FeatureItem = {
  icon: LucideIcon;
  titleKey: string;
  descKey: string;
};

const HELPER_WELCOME_FEATURES: FeatureItem[] = [
  {
    icon: MapPin,
    titleKey: 'app_tutorial.helper.card1_feature1_title',
    descKey: 'app_tutorial.helper.card1_feature1_desc',
  },
  {
    icon: DollarSign,
    titleKey: 'app_tutorial.helper.card1_feature2_title',
    descKey: 'app_tutorial.helper.card1_feature2_desc',
  },
  {
    icon: Star,
    titleKey: 'app_tutorial.helper.card1_feature3_title',
    descKey: 'app_tutorial.helper.card1_feature3_desc',
  },
];

export function TutorialHelperWelcomeHero({ titleId }: { titleId?: string }) {
  const { t } = useLanguage();

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
      <div className="relative h-[min(36dvh,280px)] w-full shrink-0 overflow-hidden bg-[#F3F8FF] pt-10 sm:h-[min(38dvh,300px)]">
        <img
          src={BRAND.tutorialH1}
          alt=""
          className="absolute left-1/2 top-0 h-[130%] w-[138%] max-w-none -translate-x-1/2 -translate-y-[18%] object-cover object-[center_32%]"
          loading="eager"
          decoding="async"
        />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white via-white/85 to-transparent" />
      </div>

      {/* Conjunto: chip + textos + features — sobe um pouco e sobrepõe levemente o fim da imagem */}
      <div className="relative z-10 mt-auto flex w-full -translate-y-9 flex-col items-center px-6 pb-3">
        <div className="w-[min(88%,280px)]">
          <div className="flex items-center gap-2.5 rounded-2xl bg-white px-3.5 py-2.5 shadow-[0_12px_32px_rgba(37,99,255,0.16)] ring-1 ring-[#2563FF]/10">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#2563FF] text-white shadow-[0_8px_18px_rgba(37,99,255,0.28)]">
              <BriefcaseBusiness className="h-4 w-4" strokeWidth={2.4} />
            </span>
            <div className="min-w-0 text-left">
              <p className="truncate text-sm font-black leading-tight text-[#2563FF]">
                {t('app_tutorial.helper.card1_badge_title')}
              </p>
              <p className="truncate text-xs font-medium leading-tight text-[#64748B]">
                {t('app_tutorial.helper.card1_badge_sub')}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-3.5 w-full text-center">
          <h2
            id={titleId}
            className="text-[1.32rem] font-black leading-tight tracking-tight text-[#0B1220] sm:text-[1.45rem]"
          >
            {t('app_tutorial.helper.card1_title_before')}
            <span className="text-[#2563FF]">{t('app_tutorial.helper.card1_title_brand')}</span>
            {t('app_tutorial.helper.card1_title_after')}
          </h2>
          <p className="mx-auto mt-1.5 max-w-[320px] text-sm font-medium leading-snug text-[#64748B]">
            {t('app_tutorial.helper.card1_desc')}
          </p>
        </div>

        <ul className="mt-3.5 flex w-full max-w-[340px] flex-col gap-3">
          {HELPER_WELCOME_FEATURES.map(({ icon: Icon, titleKey, descKey }) => (
            <li key={titleKey} className="flex items-start gap-3 text-left">
              <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#EAF2FF] text-[#2563FF]">
                <Icon className="h-4 w-4" strokeWidth={2.35} />
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="text-sm font-black leading-tight text-[#0B1220]">{t(titleKey)}</p>
                <p className="mt-0.5 text-[13px] font-medium leading-snug text-[#64748B]">{t(descKey)}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const HELPER_PROFILE_CHECKLIST = [
  'app_tutorial.helper.card2_check1',
  'app_tutorial.helper.card2_check2',
  'app_tutorial.helper.card2_check3',
  'app_tutorial.helper.card2_check4',
  'app_tutorial.helper.card2_check5',
] as const;

export function TutorialHelperProfileHero({ titleId }: { titleId?: string }) {
  const { t } = useLanguage();

  return (
    <div className="h-full min-h-0 w-full overflow-y-auto overscroll-contain">
      <div className="flex min-h-full w-full flex-col">
        <div className="relative h-[min(30dvh,230px)] w-full shrink-0 overflow-hidden bg-[#F3F8FF] pt-10 sm:h-[min(32dvh,250px)]">
          <img
            src={BRAND.tutorialH2}
            alt=""
            className="absolute left-1/2 top-2 h-[128%] w-[132%] max-w-none -translate-x-1/2 -translate-y-[8%] object-cover object-[center_28%]"
            loading="eager"
            decoding="async"
          />

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-white via-white/85 to-transparent" />
        </div>

        <div className="relative z-10 -mt-4 flex w-full flex-col items-center px-6 pb-3 pt-1">
          <div className="w-full text-center">
            <h2
              id={titleId}
              className="text-[1.2rem] font-black leading-tight tracking-tight text-[#0B1220] sm:text-[1.32rem]"
            >
              {t('app_tutorial.helper.card2_title_before')}
              <span className="text-[#2563FF]">{t('app_tutorial.helper.card2_title_highlight')}</span>
            </h2>
            <p className="mx-auto mt-1.5 max-w-[320px] text-[13px] font-medium leading-snug text-[#64748B]">
              {t('app_tutorial.helper.card2_desc')}
            </p>
          </div>

          <div className="mt-3 w-full max-w-[340px] overflow-hidden rounded-2xl bg-white shadow-[0_10px_28px_rgba(37,99,255,0.10)] ring-1 ring-[#E2E8F0]">
            <p className="px-3.5 pb-1 pt-2.5 text-[13px] font-black text-[#2563FF]">
              {t('app_tutorial.helper.card2_checklist_title')}
            </p>
            <ul>
              {HELPER_PROFILE_CHECKLIST.map((key, index) => (
                <li
                  key={key}
                  className={
                    index < HELPER_PROFILE_CHECKLIST.length - 1
                      ? 'flex items-center gap-2.5 border-b border-[#E8EEF7] px-3.5 py-1.5'
                      : 'flex items-center gap-2.5 px-3.5 py-1.5'
                  }
                >
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#EAF2FF] text-[#2563FF]">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span className="text-[13px] font-semibold text-[#0B1220]">{t(key)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-3 flex w-full max-w-[340px] items-start gap-2 rounded-2xl bg-[#EAF2FF] px-3 py-2.5">
            <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white text-[#2563FF] shadow-sm">
              <Lightbulb className="h-3.5 w-3.5" strokeWidth={2.4} />
            </span>
            <p className="min-w-0 text-left text-[12px] font-medium leading-snug text-[#334155]">
              {t('app_tutorial.helper.card2_tip_before')}
              <span className="font-black text-[#2563FF]">{t('app_tutorial.helper.card2_tip_highlight')}</span>
              {t('app_tutorial.helper.card2_tip_after')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const HELPER_FEED_FEATURES: FeatureItem[] = [
  {
    icon: MapPin,
    titleKey: 'app_tutorial.helper.card3_feature1_title',
    descKey: 'app_tutorial.helper.card3_feature1_desc',
  },
  {
    icon: FileText,
    titleKey: 'app_tutorial.helper.card3_feature2_title',
    descKey: 'app_tutorial.helper.card3_feature2_desc',
  },
  {
    icon: DollarSign,
    titleKey: 'app_tutorial.helper.card3_feature3_title',
    descKey: 'app_tutorial.helper.card3_feature3_desc',
  },
  {
    icon: Calendar,
    titleKey: 'app_tutorial.helper.card3_feature4_title',
    descKey: 'app_tutorial.helper.card3_feature4_desc',
  },
  {
    icon: Tag,
    titleKey: 'app_tutorial.helper.card3_feature5_title',
    descKey: 'app_tutorial.helper.card3_feature5_desc',
  },
];

export function TutorialHelperFeedHero({ titleId }: { titleId?: string }) {
  const { t } = useLanguage();

  return (
    <div className="h-full min-h-0 w-full overflow-y-auto overscroll-contain">
      <div className="flex min-h-full w-full flex-col">
        <div className="relative h-[min(30dvh,230px)] w-full shrink-0 overflow-hidden bg-[#F3F8FF] pt-10 sm:h-[min(32dvh,250px)]">
          <img
            src={BRAND.tutorialH3}
            alt=""
            className="absolute left-1/2 top-2 h-[128%] w-[132%] max-w-none -translate-x-1/2 -translate-y-[8%] object-cover object-[center_28%]"
            loading="eager"
            decoding="async"
          />

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-white via-white/85 to-transparent" />
        </div>

        <div className="relative z-10 -mt-4 flex w-full flex-col items-center px-6 pb-3 pt-1">
          <div className="w-full text-center">
            <h2
              id={titleId}
              className="text-[1.2rem] font-black leading-tight tracking-tight text-[#0B1220] sm:text-[1.32rem]"
            >
              {t('app_tutorial.helper.card3_title_before')}
              <span className="text-[#2563FF]">{t('app_tutorial.helper.card3_title_highlight')}</span>
            </h2>
            <p className="mx-auto mt-1.5 max-w-[320px] text-[13px] font-medium leading-snug text-[#64748B]">
              {t('app_tutorial.helper.card3_desc')}
            </p>
          </div>

          <div className="mt-3 w-full max-w-[340px] overflow-hidden rounded-2xl bg-white shadow-[0_10px_28px_rgba(37,99,255,0.10)] ring-1 ring-[#E2E8F0]">
            <p className="px-3.5 pb-1 pt-2.5 text-[13px] font-black text-[#2563FF]">
              {t('app_tutorial.helper.card3_list_title')}
            </p>
            <ul>
              {HELPER_FEED_FEATURES.map(({ icon: Icon, titleKey, descKey }, index) => (
                <li
                  key={titleKey}
                  className={
                    index < HELPER_FEED_FEATURES.length - 1
                      ? 'flex items-start gap-2.5 border-b border-[#E8EEF7] px-3.5 py-2'
                      : 'flex items-start gap-2.5 px-3.5 py-2'
                  }
                >
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#EAF2FF] text-[#2563FF]">
                    <Icon className="h-3.5 w-3.5" strokeWidth={2.4} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-black leading-tight text-[#0B1220]">{t(titleKey)}</p>
                    <p className="mt-0.5 text-[12px] font-medium leading-snug text-[#64748B]">{t(descKey)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-3 flex w-full max-w-[340px] items-start gap-2 rounded-2xl bg-[#EAF2FF] px-3 py-2.5">
            <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white text-[#2563FF] shadow-sm">
              <Search className="h-3.5 w-3.5" strokeWidth={2.4} />
            </span>
            <p className="min-w-0 text-left text-[12px] font-medium leading-snug text-[#334155]">
              {t('app_tutorial.helper.card3_tip_before')}
              <span className="font-black text-[#2563FF]">{t('app_tutorial.helper.card3_tip_highlight')}</span>
              {t('app_tutorial.helper.card3_tip_after')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const HELPER_CREDITS_SUMMARY = [
  {
    before: 'app_tutorial.helper.card4_summary1_before',
    highlight: 'app_tutorial.helper.card4_summary1_highlight',
    after: 'app_tutorial.helper.card4_summary1_after',
  },
  {
    before: 'app_tutorial.helper.card4_summary2_before',
    highlight: 'app_tutorial.helper.card4_summary2_highlight',
    after: 'app_tutorial.helper.card4_summary2_after',
  },
  {
    before: 'app_tutorial.helper.card4_summary3_before',
    highlight: '',
    after: '',
  },
] as const;

export function TutorialHelperCreditsHero({ titleId }: { titleId?: string }) {
  const { t } = useLanguage();

  return (
    <div className="h-full min-h-0 w-full overflow-y-auto overscroll-contain">
      <div className="flex min-h-full w-full flex-col">
        <div className="relative h-[min(30dvh,230px)] w-full shrink-0 overflow-hidden bg-[#F3F8FF] pt-10 sm:h-[min(32dvh,250px)]">
          <img
            src={BRAND.tutorialH4}
            alt=""
            className="absolute left-1/2 top-2 h-[128%] w-[132%] max-w-none -translate-x-1/2 -translate-y-[8%] object-cover object-[center_28%]"
            loading="eager"
            decoding="async"
          />

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-white via-white/85 to-transparent" />
        </div>

        <div className="relative z-10 -mt-4 flex w-full flex-col items-center px-6 pb-3 pt-1">
          <div className="w-full text-center">
            <h2
              id={titleId}
              className="text-[1.2rem] font-black leading-tight tracking-tight text-[#0B1220] sm:text-[1.32rem]"
            >
              {t('app_tutorial.helper.card4_title_before')}
              <span className="text-[#2563FF]">{t('app_tutorial.helper.card4_title_highlight')}</span>
            </h2>
            <p className="mx-auto mt-1.5 max-w-[320px] text-[13px] font-medium leading-snug text-[#64748B]">
              {t('app_tutorial.helper.card4_desc_before')}
              <span className="font-black text-[#0B1220]">{t('app_tutorial.helper.card4_desc_highlight')}</span>
              {t('app_tutorial.helper.card4_desc_after')}
            </p>
          </div>

          <div className="mt-3 flex w-full max-w-[340px] flex-col gap-2.5">
            <div className="flex items-start gap-2.5 rounded-2xl border border-[#DBEAFE] bg-white p-3 shadow-[0_8px_22px_rgba(37,99,255,0.08)]">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#EAF2FF] text-[#2563FF]">
                <Undo2 className="h-4 w-4" strokeWidth={2.4} />
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-black leading-tight text-[#2563FF]">
                  {t('app_tutorial.helper.card4_not_chosen_title')}
                </p>
                <p className="mt-1 text-[12px] font-medium leading-snug text-[#64748B]">
                  {t('app_tutorial.helper.card4_not_chosen_desc')}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-[#BBF7D0] bg-white p-3 shadow-[0_8px_22px_rgba(22,163,74,0.08)]">
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#DCFCE7] text-[#16A34A]">
                  <CheckCircle2 className="h-4 w-4" strokeWidth={2.4} />
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-black leading-tight text-[#16A34A]">
                    {t('app_tutorial.helper.card4_chosen_title')}
                  </p>
                  <ul className="mt-1.5 space-y-1.5">
                    <li className="flex items-start gap-2 text-[12px] font-medium leading-snug text-[#64748B]">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#16A34A]" strokeWidth={3} />
                      <span>{t('app_tutorial.helper.card4_chosen_item1')}</span>
                    </li>
                    <li className="flex items-start gap-2 text-[12px] font-medium leading-snug text-[#64748B]">
                      <CreditCard className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#16A34A]" strokeWidth={2.4} />
                      <span>{t('app_tutorial.helper.card4_chosen_item2')}</span>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="mt-2.5 flex items-start gap-2 rounded-xl bg-[#F0FDF4] px-2.5 py-2">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#16A34A]" strokeWidth={2.4} />
                <p className="text-[11px] font-medium leading-snug text-[#166534]">
                  {t('app_tutorial.helper.card4_chosen_note')}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-3 w-full max-w-[340px]">
            <p className="text-[13px] font-black text-[#2563FF]">{t('app_tutorial.helper.card4_summary_title')}</p>
            <ul className="mt-2 space-y-2">
              {HELPER_CREDITS_SUMMARY.map((item) => (
                <li key={item.before} className="flex items-start gap-2">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#EAF2FF] text-[#2563FF]">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <p className="text-[12px] font-medium leading-snug text-[#334155]">
                    {item.highlight ? (
                      <>
                        {t(item.before)}
                        <span className="font-black text-[#2563FF]">{t(item.highlight)}</span>
                        {t(item.after)}
                      </>
                    ) : (
                      t(item.before)
                    )}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-3 flex w-full max-w-[340px] items-start gap-2 rounded-2xl bg-[#EAF2FF] px-3 py-2.5">
            <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white text-[#2563FF] shadow-sm">
              <Lightbulb className="h-3.5 w-3.5" strokeWidth={2.4} />
            </span>
            <p className="min-w-0 text-left text-[12px] font-medium leading-snug text-[#334155]">
              {t('app_tutorial.helper.card4_tip_before')}
              <span className="font-black text-[#2563FF]">{t('app_tutorial.helper.card4_tip_highlight1')}</span>
              {t('app_tutorial.helper.card4_tip_mid')}
              <span className="font-black text-[#2563FF]">{t('app_tutorial.helper.card4_tip_highlight2')}</span>
              {t('app_tutorial.helper.card4_tip_after')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const HELPER_EXCLUSIVE_STEPS: FeatureItem[] = [
  {
    icon: Gem,
    titleKey: 'app_tutorial.helper.card5_step1_title',
    descKey: 'app_tutorial.helper.card5_step1_desc',
  },
  {
    icon: UserRound,
    titleKey: 'app_tutorial.helper.card5_step2_title',
    descKey: 'app_tutorial.helper.card5_step2_desc',
  },
  {
    icon: Rocket,
    titleKey: 'app_tutorial.helper.card5_step3_title',
    descKey: 'app_tutorial.helper.card5_step3_desc',
  },
];

export function TutorialHelperExclusiveHero({ titleId }: { titleId?: string }) {
  const { t } = useLanguage();

  return (
    <div className="h-full min-h-0 w-full overflow-y-auto overscroll-contain">
      <div className="flex min-h-full w-full flex-col">
        <div className="relative h-[min(30dvh,230px)] w-full shrink-0 overflow-hidden bg-[#F3F8FF] pt-10 sm:h-[min(32dvh,250px)]">
          <img
            src={BRAND.tutorialH5}
            alt=""
            className="absolute left-1/2 top-5 h-[128%] w-[132%] max-w-none -translate-x-1/2 object-cover object-[center_22%]"
            loading="eager"
            decoding="async"
          />

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-white via-white/85 to-transparent" />
        </div>

        <div className="relative z-10 -mt-1 flex w-full flex-col items-center px-6 pb-3 pt-2">
          <div className="w-full text-center">
            <h2
              id={titleId}
              className="text-[1.2rem] font-black leading-tight tracking-tight text-[#0B1220] sm:text-[1.32rem]"
            >
              {t('app_tutorial.helper.card5_title_before')}
              <span className="text-[#2563FF]">{t('app_tutorial.helper.card5_title_highlight')}</span>
            </h2>
            <p className="mx-auto mt-1.5 max-w-[320px] text-[13px] font-medium leading-snug text-[#64748B]">
              {t('app_tutorial.helper.card5_desc')}
            </p>
          </div>

          <div className="mt-3 w-full max-w-[340px] overflow-hidden rounded-2xl bg-white shadow-[0_10px_28px_rgba(37,99,255,0.10)] ring-1 ring-[#E2E8F0]">
            <p className="px-3.5 pb-1 pt-2.5 text-[13px] font-black text-[#2563FF]">
              {t('app_tutorial.helper.card5_how_title')}
            </p>
            <ul>
              {HELPER_EXCLUSIVE_STEPS.map(({ icon: Icon, titleKey, descKey }, index) => (
                <li
                  key={titleKey}
                  className={
                    index < HELPER_EXCLUSIVE_STEPS.length - 1
                      ? 'flex items-center gap-2.5 border-b border-[#E8EEF7] px-3.5 py-2.5'
                      : 'flex items-center gap-2.5 px-3.5 py-2.5'
                  }
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#EAF2FF] text-[#2563FF]">
                    <Icon className="h-3.5 w-3.5" strokeWidth={2.4} />
                  </span>
                  <p className="min-w-0 text-[13px] font-black leading-snug text-[#0B1220]">{t(descKey)}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-2.5 flex w-full max-w-[340px] items-start gap-2.5 rounded-2xl border border-[#BBF7D0] bg-white p-3 shadow-[0_8px_22px_rgba(22,163,74,0.08)]">
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#DCFCE7] text-[#16A34A]">
              <Undo2 className="h-4 w-4" strokeWidth={2.4} />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-black leading-tight text-[#16A34A]">
                {t('app_tutorial.helper.card5_refuse_title')}
              </p>
              <p className="mt-1 text-[12px] font-medium leading-snug text-[#64748B]">
                {t('app_tutorial.helper.card5_refuse_before')}
                <span className="font-black text-[#16A34A]">{t('app_tutorial.helper.card5_refuse_highlight')}</span>
                {t('app_tutorial.helper.card5_refuse_after')}
              </p>
            </div>
          </div>

          <div className="mt-3 flex w-full max-w-[340px] items-start gap-2 rounded-2xl bg-[#EAF2FF] px-3 py-2.5">
            <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white text-[#2563FF] shadow-sm">
              <Lightbulb className="h-3.5 w-3.5" strokeWidth={2.4} />
            </span>
            <p className="min-w-0 text-left text-[12px] font-medium leading-snug text-[#334155]">
              {t('app_tutorial.helper.card5_tip_before')}
              <span className="font-black text-[#2563FF]">{t('app_tutorial.helper.card5_tip_highlight')}</span>
              {t('app_tutorial.helper.card5_tip_after')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const HELPER_CHAT_FEATURES: FeatureItem[] = [
  {
    icon: MessageCircle,
    titleKey: 'app_tutorial.helper.card6_chat1_title',
    descKey: 'app_tutorial.helper.card6_chat1_desc',
  },
  {
    icon: MapPin,
    titleKey: 'app_tutorial.helper.card6_chat2_title',
    descKey: 'app_tutorial.helper.card6_chat2_desc',
  },
  {
    icon: Calendar,
    titleKey: 'app_tutorial.helper.card6_chat3_title',
    descKey: 'app_tutorial.helper.card6_chat3_desc',
  },
  {
    icon: Camera,
    titleKey: 'app_tutorial.helper.card6_chat4_title',
    descKey: 'app_tutorial.helper.card6_chat4_desc',
  },
];

const HELPER_AFTER_STEPS = [
  'app_tutorial.helper.card6_after1',
  'app_tutorial.helper.card6_after2',
  'app_tutorial.helper.card6_after3',
  'app_tutorial.helper.card6_after4',
] as const;

export function TutorialHelperChatServiceHero({ titleId }: { titleId?: string }) {
  const { t } = useLanguage();

  return (
    <div className="h-full min-h-0 w-full overflow-y-auto overscroll-contain">
      <div className="flex min-h-full w-full flex-col">
        <div className="relative h-[min(30dvh,230px)] w-full shrink-0 overflow-hidden bg-[#F3F8FF] pt-10 sm:h-[min(32dvh,250px)]">
          <img
            src={BRAND.tutorialH6}
            alt=""
            className="absolute left-1/2 top-5 h-[128%] w-[132%] max-w-none -translate-x-1/2 object-cover object-[center_22%]"
            loading="eager"
            decoding="async"
          />

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-white via-white/85 to-transparent" />
        </div>

        <div className="relative z-10 -mt-1 flex w-full flex-col items-center px-6 pb-3 pt-2">
          <div className="w-full text-center">
            <h2
              id={titleId}
              className="text-[1.2rem] font-black leading-tight tracking-tight text-[#0B1220] sm:text-[1.32rem]"
            >
              {t('app_tutorial.helper.card6_title_before')}
              <span className="text-[#2563FF]">{t('app_tutorial.helper.card6_title_highlight')}</span>
            </h2>
            <p className="mx-auto mt-1.5 max-w-[320px] text-[13px] font-medium leading-snug text-[#64748B]">
              {t('app_tutorial.helper.card6_desc')}
            </p>
          </div>

          <div className="mt-3 w-full max-w-[340px] overflow-hidden rounded-2xl bg-white shadow-[0_10px_28px_rgba(37,99,255,0.10)] ring-1 ring-[#E2E8F0]">
            <p className="px-3.5 pb-1 pt-2.5 text-[13px] font-black text-[#2563FF]">
              {t('app_tutorial.helper.card6_chat_title')}
            </p>
            <ul>
              {HELPER_CHAT_FEATURES.map(({ icon: Icon, titleKey, descKey }, index) => (
                <li
                  key={titleKey}
                  className={
                    index < HELPER_CHAT_FEATURES.length - 1
                      ? 'flex items-start gap-2.5 border-b border-[#E8EEF7] px-3.5 py-2'
                      : 'flex items-start gap-2.5 px-3.5 py-2'
                  }
                >
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#EAF2FF] text-[#2563FF]">
                    <Icon className="h-3.5 w-3.5" strokeWidth={2.4} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-black leading-tight text-[#0B1220]">{t(titleKey)}</p>
                    <p className="mt-0.5 text-[12px] font-medium leading-snug text-[#64748B]">{t(descKey)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-2.5 w-full max-w-[340px] overflow-hidden rounded-2xl bg-white shadow-[0_10px_28px_rgba(37,99,255,0.10)] ring-1 ring-[#E2E8F0]">
            <p className="px-3.5 pb-1 pt-2.5 text-[13px] font-black text-[#2563FF]">
              {t('app_tutorial.helper.card6_after_title')}
            </p>
            <ul>
              {HELPER_AFTER_STEPS.map((key, index) => (
                <li
                  key={key}
                  className={
                    index < HELPER_AFTER_STEPS.length - 1
                      ? 'flex items-center gap-2.5 border-b border-[#E8EEF7] px-3.5 py-2'
                      : 'flex items-center gap-2.5 px-3.5 py-2'
                  }
                >
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#EAF2FF] text-[#2563FF]">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <p className="flex min-w-0 items-center gap-1 text-[13px] font-semibold text-[#0B1220]">
                    <span>{t(key)}</span>
                    {index === HELPER_AFTER_STEPS.length - 1 ? (
                      <Star className="h-3.5 w-3.5 fill-[#FBBF24] text-[#FBBF24]" />
                    ) : null}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-3 flex w-full max-w-[340px] items-start gap-2 rounded-2xl bg-[#EAF2FF] px-3 py-2.5">
            <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white text-[#2563FF] shadow-sm">
              <Star className="h-3.5 w-3.5" strokeWidth={2.4} />
            </span>
            <p className="min-w-0 text-left text-[12px] font-medium leading-snug text-[#334155]">
              {t('app_tutorial.helper.card6_tip_before')}
              <span className="font-black text-[#2563FF]">{t('app_tutorial.helper.card6_tip_highlight')}</span>
              {t('app_tutorial.helper.card6_tip_after')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const HELPER_EVOLUTION_LEVELS = [
  { src: medalNovoHelper, labelKey: 'app_tutorial.helper.card7_level1' },
  { src: medalIniciante, labelKey: 'app_tutorial.helper.card7_level2' },
  { src: medalProfissional, labelKey: 'app_tutorial.helper.card7_level3' },
  { src: medalElite, labelKey: 'app_tutorial.helper.card7_level4' },
  { src: medalTop, labelKey: 'app_tutorial.helper.card7_level5' },
  { src: medalLenda, labelKey: 'app_tutorial.helper.card7_level6' },
] as const;

type BenefitItem = {
  icon: LucideIcon;
  iconClass: string;
  bgClass: string;
  textKey: string;
  highlightKey?: string;
  afterKey?: string;
};

const HELPER_BENEFITS: BenefitItem[] = [
  {
    icon: Star,
    iconClass: 'text-[#2563FF]',
    bgClass: 'bg-[#EAF2FF]',
    textKey: 'app_tutorial.helper.card7_benefit1',
  },
  {
    icon: Crown,
    iconClass: 'text-[#7C3AED]',
    bgClass: 'bg-[#F3E8FF]',
    textKey: 'app_tutorial.helper.card7_benefit2',
  },
  {
    icon: Rocket,
    iconClass: 'text-[#EA580C]',
    bgClass: 'bg-[#FFEDD5]',
    textKey: 'app_tutorial.helper.card7_benefit3',
  },
  {
    icon: Gift,
    iconClass: 'text-[#0D9488]',
    bgClass: 'bg-[#CCFBF1]',
    textKey: 'app_tutorial.helper.card7_benefit4_before',
    highlightKey: 'app_tutorial.helper.card7_benefit4_highlight',
    afterKey: 'app_tutorial.helper.card7_benefit4_after',
  },
  {
    icon: Gift,
    iconClass: 'text-[#CA8A04]',
    bgClass: 'bg-[#FEF9C3]',
    textKey: 'app_tutorial.helper.card7_benefit5_before',
    highlightKey: 'app_tutorial.helper.card7_benefit5_highlight',
    afterKey: 'app_tutorial.helper.card7_benefit5_after',
  },
];

export function TutorialHelperReputationHero({ titleId }: { titleId?: string }) {
  const { t } = useLanguage();

  return (
    <div className="h-full min-h-0 w-full overflow-y-auto overscroll-contain">
      <div className="flex min-h-full w-full flex-col">
        <div className="relative h-[min(32dvh,250px)] w-full shrink-0 overflow-hidden bg-[#F3F8FF] pt-10 sm:h-[min(34dvh,270px)]">
          <img
            src={BRAND.tutorialH7}
            alt=""
            className="absolute left-1/2 top-0 h-[140%] w-[138%] max-w-none -translate-x-1/2 object-cover object-[center_top]"
            loading="eager"
            decoding="async"
          />

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-white via-white/85 to-transparent" />
        </div>

        <div className="relative z-10 mt-1 flex w-full flex-col items-center px-6 pb-3 pt-3">
          <div className="mt-2 w-full text-center">
            <h2
              id={titleId}
              className="text-[1.2rem] font-black leading-tight tracking-tight text-[#0B1220] sm:text-[1.32rem]"
            >
              {t('app_tutorial.helper.card7_title_before')}
              <span className="text-[#2563FF]">{t('app_tutorial.helper.card7_title_highlight')}</span>
            </h2>
          </div>

          <div className="mt-3 w-full max-w-[340px] px-1">
            <div className="flex items-center justify-between gap-0">
              {HELPER_EVOLUTION_LEVELS.map((level, index) => (
                <div key={level.labelKey} className="flex min-w-0 flex-1 items-center">
                  <div className="mx-auto flex h-14 w-14 shrink-0 items-center justify-center sm:h-16 sm:w-16">
                    <img
                      src={level.src}
                      alt=""
                      className="h-full w-full scale-110 object-contain"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  {index < HELPER_EVOLUTION_LEVELS.length - 1 ? (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#CBD5E1]" strokeWidth={2.5} />
                  ) : null}
                </div>
              ))}
            </div>
            <p className="mt-1.5 text-center text-[13px] font-black text-[#2563FF]">
              {t('app_tutorial.helper.card7_evolution_title')}
            </p>
          </div>

          <div className="mt-3 w-full max-w-[340px] overflow-hidden rounded-2xl bg-white shadow-[0_10px_28px_rgba(37,99,255,0.10)] ring-1 ring-[#E2E8F0]">
            <p className="px-3.5 pb-1 pt-2.5 text-[13px] font-black text-[#2563FF]">
              {t('app_tutorial.helper.card7_benefits_title')}
            </p>
            <ul>
              {HELPER_BENEFITS.map((item, index) => {
                const Icon = item.icon;
                return (
                  <li
                    key={item.textKey}
                    className={
                      index < HELPER_BENEFITS.length - 1
                        ? 'flex items-center gap-2.5 border-b border-[#E8EEF7] px-3.5 py-2'
                        : 'flex items-center gap-2.5 px-3.5 py-2'
                    }
                  >
                    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${item.bgClass} ${item.iconClass}`}>
                      <Icon className="h-3.5 w-3.5" strokeWidth={2.4} />
                    </span>
                    <p className="min-w-0 text-[12px] font-semibold leading-snug text-[#0B1220]">
                      {item.highlightKey ? (
                        <>
                          {t(item.textKey)}
                          <span className="font-black text-[#2563FF]">{t(item.highlightKey)}</span>
                          {item.afterKey ? t(item.afterKey) : null}
                        </>
                      ) : (
                        t(item.textKey)
                      )}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="mt-3 flex w-full max-w-[340px] items-start gap-2 rounded-2xl bg-[#EAF2FF] px-3 py-2.5">
            <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white text-[#2563FF] shadow-sm">
              <Trophy className="h-3.5 w-3.5" strokeWidth={2.4} />
            </span>
            <p className="min-w-0 text-left text-[12px] font-medium leading-snug text-[#334155]">
              {t('app_tutorial.helper.card7_tip_before')}
              <span className="font-black text-[#2563FF]">{t('app_tutorial.helper.card7_tip_highlight')}</span>
              {t('app_tutorial.helper.card7_tip_after')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
