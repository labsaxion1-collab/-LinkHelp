import type { HelperPortfolioPersist } from '@/utils/helperPortfolioState';
import { portfolioPhotos, portfolioVideos } from '@/utils/helperPortfolioState';
import type { HelperProfileSettings } from '@/utils/helperProfileSettings';

export interface HelperCompletionBreakdown {
  profilePhoto: boolean;
  skillsSelected: boolean;
  portfolioPhoto: boolean;
  portfolioVideo: boolean;
  hasReviews: boolean;
  verified: boolean;
  percent: number;
}

/** Weights sum to 100 — aligned with product spec */
const WEIGHT = {
  profilePhoto: 15,
  skillsSelected: 15,
  portfolioPhoto: 15,
  portfolioVideo: 20,
  verified: 20,
  hasReviews: 15,
} as const;

export function computeHelperProfileCompletion(
  portfolio: HelperPortfolioPersist,
  profile: HelperProfileSettings,
): HelperCompletionBreakdown {
  const profilePhoto = Boolean(profile.avatarDataUrl);
  const skillsSelected = profile.skillIds.length >= 1;
  const portfolioPhoto = portfolioPhotos(portfolio).length >= 1;
  const portfolioVideo = portfolioVideos(portfolio).length >= 1;
  const hasReviews = profile.reviewCount >= 1;
  const verified = profile.verificationStatus === 'verified';

  let percent = 0;
  if (profilePhoto) percent += WEIGHT.profilePhoto;
  if (skillsSelected) percent += WEIGHT.skillsSelected;
  if (portfolioPhoto) percent += WEIGHT.portfolioPhoto;
  if (portfolioVideo) percent += WEIGHT.portfolioVideo;
  if (verified) percent += WEIGHT.verified;
  if (hasReviews) percent += WEIGHT.hasReviews;

  return {
    profilePhoto,
    skillsSelected,
    portfolioPhoto,
    portfolioVideo,
    hasReviews,
    verified,
    percent: Math.min(100, percent),
  };
}

export type CompletionRowKey = Exclude<keyof HelperCompletionBreakdown, 'percent'>;
