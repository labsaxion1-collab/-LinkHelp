import { BRAND } from '@/utils/brandAssets';
import { clsx } from 'clsx';
import { useLanguage } from '@/context/LanguageContext';
import { TutorialAppBottomNavPreview } from '@/components/tutorial/TutorialAppBottomNavPreview';
import { TutorialCelebrationEffects } from '@/components/tutorial/TutorialCelebrationEffects';
import { TUTORIAL_COMPARE_HERO, TUTORIAL_LINK_CREDITS_HERO, TUTORIAL_NEARBY_HERO, TUTORIAL_PUBLISH_HERO, TUTORIAL_SECURE_CHAT_HERO, TUTORIAL_WELCOME_HERO, TutorialImmersiveHero } from '@/components/tutorial/TutorialImmersiveHero';

function TutorialCreditsHighlight({ label, celebrate = false }: { label: string; celebrate?: boolean }) {
  return (
    <div className="mt-4 flex w-full justify-center">
      <span
        className={clsx(
          'inline-flex items-center gap-2 rounded-full bg-[#EAF2FF] px-4 py-2 text-sm font-black text-[#2563FF] ring-1 ring-[#2563FF]/15',
          celebrate && 'lh-tutorial-credits-badge-pop',
        )}
      >
        <img src={BRAND.linkCreditCoin} alt="" className="h-5 w-5 object-contain" loading="lazy" decoding="async" />
        {label}
      </span>
    </div>
  );
}

export function TutorialWelcomeTitle({ id }: { id?: string }) {
  const { t } = useLanguage();

  return (
    <div className="flex w-full justify-center">
      <div className="inline-flex items-center gap-4 sm:gap-5">
        <img
          src={BRAND.logoIcon}
          alt=""
          className="h-[4.75rem] w-[4.75rem] shrink-0 object-contain drop-shadow-[0_8px_22px_rgba(37,99,255,0.24)] sm:h-[5.25rem] sm:w-[5.25rem]"
          loading="eager"
          decoding="async"
        />
        <div className="flex shrink-0 flex-col justify-center text-left">
          <span className="block text-[1.15rem] font-black leading-tight text-[#0B1220] sm:text-[1.35rem]">
            {t('client_onboarding_tutorial.step1_title_line1')}
          </span>
          <span id={id} className="mt-0.5 block text-[1.65rem] font-black leading-tight tracking-tight sm:text-[1.85rem]">
            <span className="text-[#0B1220]">{t('client_onboarding_tutorial.step1_title_link')}</span>
            <span className="text-[#2563FF]">{t('client_onboarding_tutorial.step1_title_help')}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

export function TutorialStepFooterCopy({
  titleId,
  title,
  body,
  overlay = false,
}: {
  titleId?: string;
  title: string;
  body: string;
  overlay?: boolean;
}) {
  return (
    <div className={overlay ? 'flex w-full flex-col items-center' : 'mb-7 flex w-full flex-col items-center'}>
      <h2
        id={titleId}
        className="max-w-[320px] text-center text-[1.5rem] font-black leading-tight tracking-tight text-[#0B1220] sm:text-[1.65rem]"
      >
        {title}
      </h2>
      <p className="mx-auto mt-2.5 max-w-[320px] text-center text-[0.9375rem] font-medium leading-relaxed text-[#64748B] sm:text-base">{body}</p>
    </div>
  );
}

export function TutorialPublishStepHero({
  titleId,
  title,
  body,
  pulseNavCreate = false,
}: {
  titleId?: string;
  title: string;
  body: string;
  pulseNavCreate?: boolean;
}) {
  return (
    <TutorialImmersiveHero
      imageSrc={BRAND.tutorialC2}
      imageFit={TUTORIAL_PUBLISH_HERO.imageFit}
      objectPosition={TUTORIAL_PUBLISH_HERO.objectPosition}
      imageHeight={TUTORIAL_PUBLISH_HERO.imageHeight}
      imageTransform={TUTORIAL_PUBLISH_HERO.imageTransform}
      imageTransformOrigin={TUTORIAL_PUBLISH_HERO.imageTransformOrigin}
      imageMask={TUTORIAL_PUBLISH_HERO.imageMask}
      bottomFadeHeight={TUTORIAL_PUBLISH_HERO.bottomFadeHeight}
      contentBottomOffset={TUTORIAL_PUBLISH_HERO.contentBottomOffset}
    >
      <div className="mb-3">
        <TutorialAppBottomNavPreview highlightCreateButton pulseActive={pulseNavCreate} />
      </div>
      <TutorialStepFooterCopy titleId={titleId} title={title} body={body} overlay />
    </TutorialImmersiveHero>
  );
}

export function TutorialNearbyHelpersHero({
  titleId,
  title,
  body,
}: {
  titleId?: string;
  title: string;
  body: string;
}) {
  return (
    <TutorialImmersiveHero
      imageSrc={BRAND.tutorialC3}
      imageFit={TUTORIAL_NEARBY_HERO.imageFit}
      objectPosition={TUTORIAL_NEARBY_HERO.objectPosition}
      imageHeight={TUTORIAL_NEARBY_HERO.imageHeight}
      imageTransform={TUTORIAL_NEARBY_HERO.imageTransform}
      imageTransformOrigin={TUTORIAL_NEARBY_HERO.imageTransformOrigin}
      imageMask={TUTORIAL_NEARBY_HERO.imageMask}
      bottomFadeHeight={TUTORIAL_NEARBY_HERO.bottomFadeHeight}
      contentBottomOffset={TUTORIAL_NEARBY_HERO.contentBottomOffset}
    >
      <TutorialStepFooterCopy titleId={titleId} title={title} body={body} overlay />
    </TutorialImmersiveHero>
  );
}

export function TutorialCompareProposalsHero({
  titleId,
  title,
  body,
}: {
  titleId?: string;
  title: string;
  body: string;
}) {
  return (
    <TutorialImmersiveHero
      imageSrc={BRAND.tutorialC4}
      imageFit={TUTORIAL_COMPARE_HERO.imageFit}
      objectPosition={TUTORIAL_COMPARE_HERO.objectPosition}
      imageHeight={TUTORIAL_COMPARE_HERO.imageHeight}
      imageTransform={TUTORIAL_COMPARE_HERO.imageTransform}
      imageTransformOrigin={TUTORIAL_COMPARE_HERO.imageTransformOrigin}
      imageMask={TUTORIAL_COMPARE_HERO.imageMask}
      bottomFadeHeight={TUTORIAL_COMPARE_HERO.bottomFadeHeight}
      contentBottomOffset={TUTORIAL_COMPARE_HERO.contentBottomOffset}
    >
      <TutorialStepFooterCopy titleId={titleId} title={title} body={body} overlay />
    </TutorialImmersiveHero>
  );
}

export function TutorialSecureChatHero({
  titleId,
  title,
  body,
}: {
  titleId?: string;
  title: string;
  body: string;
}) {
  return (
    <TutorialImmersiveHero
      imageSrc={BRAND.tutorialC5}
      imageFit={TUTORIAL_SECURE_CHAT_HERO.imageFit}
      objectPosition={TUTORIAL_SECURE_CHAT_HERO.objectPosition}
      imageHeight={TUTORIAL_SECURE_CHAT_HERO.imageHeight}
      imageTransform={TUTORIAL_SECURE_CHAT_HERO.imageTransform}
      imageTransformOrigin={TUTORIAL_SECURE_CHAT_HERO.imageTransformOrigin}
      imageMask={TUTORIAL_SECURE_CHAT_HERO.imageMask}
      bottomFadeHeight={TUTORIAL_SECURE_CHAT_HERO.bottomFadeHeight}
      contentBottomOffset={TUTORIAL_SECURE_CHAT_HERO.contentBottomOffset}
    >
      <TutorialStepFooterCopy titleId={titleId} title={title} body={body} overlay />
    </TutorialImmersiveHero>
  );
}

export function TutorialLinkCreditsHero({
  titleId,
  title,
  body,
  creditsLabel,
  celebrate = false,
}: {
  titleId?: string;
  title: string;
  body: string;
  creditsLabel: string;
  celebrate?: boolean;
}) {
  return (
    <div className="relative h-full w-full">
      <TutorialImmersiveHero
        imageSrc={BRAND.tutorialC6}
        imageFit={TUTORIAL_LINK_CREDITS_HERO.imageFit}
        objectPosition={TUTORIAL_LINK_CREDITS_HERO.objectPosition}
        imageHeight={TUTORIAL_LINK_CREDITS_HERO.imageHeight}
        imageTransform={TUTORIAL_LINK_CREDITS_HERO.imageTransform}
        imageTransformOrigin={TUTORIAL_LINK_CREDITS_HERO.imageTransformOrigin}
        imageMask={TUTORIAL_LINK_CREDITS_HERO.imageMask}
        bottomFadeHeight={TUTORIAL_LINK_CREDITS_HERO.bottomFadeHeight}
        contentBottomOffset={TUTORIAL_LINK_CREDITS_HERO.contentBottomOffset}
        celebrationImageReveal={celebrate}
      >
        <TutorialStepFooterCopy titleId={titleId} title={title} body={body} overlay />
        <TutorialCreditsHighlight label={creditsLabel} celebrate={celebrate} />
      </TutorialImmersiveHero>
      {celebrate ? <TutorialCelebrationEffects active={celebrate} /> : null}
    </div>
  );
}

export function TutorialWelcomeHero({ titleId, body }: { titleId?: string; body: string }) {
  return (
    <TutorialImmersiveHero
      imageSrc={BRAND.tutorialC1}
      objectPosition={TUTORIAL_WELCOME_HERO.objectPosition}
      imageHeight={TUTORIAL_WELCOME_HERO.imageHeight}
      imageTransform={TUTORIAL_WELCOME_HERO.imageTransform}
      imageTransformOrigin={TUTORIAL_WELCOME_HERO.imageTransformOrigin}
      eager
    >
      <TutorialWelcomeFooterCopy titleId={titleId} body={body} overlay />
    </TutorialImmersiveHero>
  );
}

export function TutorialWelcomeFooterCopy({
  titleId,
  body,
  overlay = false,
}: {
  titleId?: string;
  body: string;
  overlay?: boolean;
}) {
  return (
    <div className={overlay ? 'flex w-full flex-col items-center' : 'mb-7 flex w-full flex-col items-center'}>
      <TutorialWelcomeTitle id={titleId} />
      <p className="mx-auto mt-3 max-w-[320px] text-center text-base font-medium leading-relaxed text-[#64748B]">{body}</p>
    </div>
  );
}
