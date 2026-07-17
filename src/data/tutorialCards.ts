import type { LucideIcon } from 'lucide-react';
import { Banknote, BriefcaseBusiness, UserRound } from 'lucide-react';
import { BRAND } from '@/utils/brandAssets';

export type TutorialCardTitleVariant = 'default' | 'welcome';

export type TutorialCardDefinition = {
  id: string;
  imageSrc: string;
  imageFit?: 'cover' | 'contain';
  imageObjectPosition?: string;
  titleKey: string;
  descriptionKey: string;
  titleVariant?: TutorialCardTitleVariant;
  showLogoOverlay?: boolean;
  controlsOnImage?: boolean;
  auxiliaryKey?: string;
  fallbackIcon?: LucideIcon;
};

export const CLIENT_TUTORIAL_CARDS: TutorialCardDefinition[] = [
  {
    id: 'client-1',
    imageSrc: BRAND.tutorialC1,
    imageFit: 'cover',
    imageObjectPosition: 'center 32%',
    titleKey: 'client_onboarding_tutorial.step1_title',
    descriptionKey: 'client_onboarding_tutorial.step1_body',
    titleVariant: 'welcome',
    showLogoOverlay: true,
    controlsOnImage: true,
  },
  {
    id: 'client-2',
    imageSrc: BRAND.tutorialC2,
    imageFit: 'cover',
    imageObjectPosition: 'center center',
    titleKey: 'client_onboarding_tutorial.step2_title',
    descriptionKey: 'client_onboarding_tutorial.step2_body',
  },
  {
    id: 'client-3',
    imageSrc: BRAND.tutorialC3,
    imageFit: 'cover',
    imageObjectPosition: 'center center',
    titleKey: 'client_onboarding_tutorial.step3_title',
    descriptionKey: 'client_onboarding_tutorial.step3_body',
  },
  {
    id: 'client-4',
    imageSrc: BRAND.tutorialC4,
    imageFit: 'cover',
    imageObjectPosition: 'center center',
    titleKey: 'client_onboarding_tutorial.step4_title',
    descriptionKey: 'client_onboarding_tutorial.step4_body',
  },
  {
    id: 'client-5',
    imageSrc: BRAND.tutorialC5,
    imageFit: 'cover',
    imageObjectPosition: 'center center',
    titleKey: 'client_onboarding_tutorial.step5_title',
    descriptionKey: 'client_onboarding_tutorial.step5_body',
  },
  {
    id: 'client-6',
    imageSrc: BRAND.tutorialC6,
    imageFit: 'cover',
    imageObjectPosition: 'center center',
    titleKey: 'client_onboarding_tutorial.step6_title',
    descriptionKey: 'client_onboarding_tutorial.step6_body',
    auxiliaryKey: 'client_onboarding_tutorial.credits_highlight',
  },
];

export const HELPER_TUTORIAL_CARDS: TutorialCardDefinition[] = [
  {
    id: 'helper-1',
    imageSrc: BRAND.tutorialH1,
    imageFit: 'contain',
    imageObjectPosition: 'center bottom',
    titleKey: 'app_tutorial.helper.card1_title',
    descriptionKey: 'app_tutorial.helper.card1_desc',
    titleVariant: 'welcome',
    fallbackIcon: BriefcaseBusiness,
  },
  {
    id: 'helper-2',
    imageSrc: BRAND.tutorialH2,
    imageFit: 'contain',
    titleKey: 'app_tutorial.helper.card2_title',
    descriptionKey: 'app_tutorial.helper.card2_desc',
    fallbackIcon: Banknote,
  },
  {
    id: 'helper-3',
    imageSrc: BRAND.tutorialH3,
    imageFit: 'contain',
    titleKey: 'app_tutorial.helper.card3_title',
    descriptionKey: 'app_tutorial.helper.card3_desc',
    fallbackIcon: UserRound,
  },
];
