import { useCallback, useMemo, useState } from 'react';
import { AppPageShell } from '@/components/design-system/AppPageShell';
import { DesktopBackButton } from '@/components/layout/DesktopBackButton';
import { CloseToHomeButton } from '@/components/layout/CloseToHomeButton';
import { ProfileIdentityHero } from '@/components/profile/ProfileIdentityHero';
import { ProfileLinkCreditsCard } from '@/components/profile/ProfileLinkCreditsCard';
import { ProfileQuickActions } from '@/components/profile/ProfileQuickActions';
import { ProfileRecentActivity } from '@/components/profile/ProfileRecentActivity';
import { PROFILE_STAT_ICONS, ProfileStatsGrid } from '@/components/profile/ProfileStatsGrid';
import { ProfileGamificationSection } from '@/components/profile/ProfileGamificationSection';
import { PublicProfilePreviewCard } from '@/components/profile/PublicProfilePreviewCard';
import { ClientPublicProfileView } from '@/components/features/ClientPublicProfileView';
import { HelperPublicProfileView } from '@/components/features/HelperPublicProfileView';
import {
  PublicProfileSheetFrame,
  PUBLIC_PROFILE_SCROLL_ATTR,
} from '@/components/reputation/PublicProfileSheetFrame';
import { useGamification } from '@/gamification/hooks/useGamification';
import { getCurrentLevelConfig } from '@/gamification/engines/levelEngine';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useWalletBalance } from '@/hooks/useWalletBalance';
import { UI_VISIBILITY } from '@/config/uiVisibility';
import { ROUTES } from '@/utils/constants';
import {
  countCompletedForClient,
  countCompletedForHelper,
} from '@/utils/linkHelpRanking';
import { useNavigate } from 'react-router-dom';
import type { Job } from '@/types/job';

export default function ProfileDashboardPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { profile, session, authLoading } = useAuth();
  const { jobs, applications, reviews } = useAppData();
  const { balance, loading: walletLoading } = useWalletBalance();
  const [publicOpen, setPublicOpen] = useState(false);
  const [usedThisMonth, setUsedThisMonth] = useState<number | null>(null);

  const isHelper = profile?.role === 'helper';
  const userType = isHelper ? 'helper' : 'client';
  const { record } = useGamification(userType);

  const email = session?.user.email ?? profile?.email ?? '';
  const displayName =
    profile?.name?.trim() ||
    (typeof session?.user.user_metadata?.name === 'string' ? session.user.user_metadata.name : '') ||
    email ||
    'LinkHelp';
  const roleLabel = isHelper
    ? t('app_pages.settings_mode_helper')
    : t('app_pages.settings_mode_client');
  const avatarUrl = profile?.avatar_url?.trim() || '';
  const city = isHelper ? profile?.helper_base_city ?? profile?.city : profile?.city;
  const region = isHelper ? profile?.helper_base_province ?? profile?.region : profile?.region;

  const completedCount = profile?.id
    ? isHelper
      ? countCompletedForHelper(profile.id, applications)
      : countCompletedForClient(profile.id, jobs)
    : 0;

  const reviewCount = useMemo(() => {
    if (!profile?.id) return 0;
    return reviews.filter((r) => r.targetUserId === profile.id).length;
  }, [profile?.id, reviews]);

  const publishedCount = useMemo(() => {
    if (!profile?.id || isHelper) return 0;
    return jobs.filter((j) => j.clientId === profile.id && j.status !== 'cancelled').length;
  }, [profile?.id, jobs, isHelper]);

  const cancelledCount = useMemo(() => {
    if (!profile?.id || isHelper) return 0;
    return jobs.filter((j) => j.clientId === profile.id && j.status === 'cancelled').length;
  }, [profile?.id, jobs, isHelper]);

  const acceptedApplications = useMemo(() => {
    if (!profile?.id || !isHelper) return 0;
    return applications.filter(
      (a) => a.helperId === profile.id && (a.status === 'accepted' || a.status === 'completed'),
    ).length;
  }, [profile?.id, applications, isHelper]);

  const creditsAmount = isHelper ? (balance ?? 0) : (profile?.credits ?? 0);
  const creditsLoading = isHelper ? walletLoading : authLoading;
  const levelName = getCurrentLevelConfig(userType, record?.levelKey ?? 'novo').name;
  const heroKey = record?.heroKey ?? `${userType}_novo`;

  const onMonthMetrics = useCallback((value: number) => {
    setUsedThisMonth(value);
  }, []);

  const stats = useMemo(() => {
    const ratingValue =
      profile?.rating != null && profile.rating > 0 ? profile.rating.toFixed(1) : '—';
    if (isHelper) {
      return [
        {
          key: 'completed',
          label: t('profile_page.stat_services_done'),
          value: String(completedCount),
          icon: PROFILE_STAT_ICONS.completed,
          iconColor: 'text-emerald-600',
          iconBg: 'bg-emerald-50',
        },
        {
          key: 'accepted',
          label: t('profile_page.stat_applications_accepted'),
          value: String(acceptedApplications),
          icon: PROFILE_STAT_ICONS.accepted,
          iconColor: 'text-blue-600',
          iconBg: 'bg-blue-50',
        },
        {
          key: 'rating',
          label: t('profile_page.stat_avg_rating'),
          value: ratingValue,
          icon: PROFILE_STAT_ICONS.rating,
          iconColor: 'text-amber-600',
          iconBg: 'bg-amber-50',
        },
        {
          key: 'reviews',
          label: t('profile_page.stat_reviews'),
          value: String(reviewCount),
          icon: PROFILE_STAT_ICONS.published,
          iconColor: 'text-violet-600',
          iconBg: 'bg-violet-50',
        },
      ];
    }
    return [
      {
        key: 'published',
        label: t('profile_page.stat_requests_published'),
        value: String(publishedCount),
        icon: PROFILE_STAT_ICONS.published,
        iconColor: 'text-blue-600',
        iconBg: 'bg-blue-50',
      },
      {
        key: 'completed',
        label: t('profile_page.stat_services_completed'),
        value: String(completedCount),
        icon: PROFILE_STAT_ICONS.completed,
        iconColor: 'text-emerald-600',
        iconBg: 'bg-emerald-50',
      },
      {
        key: 'rating',
        label: t('profile_page.stat_avg_rating'),
        value: ratingValue,
        icon: PROFILE_STAT_ICONS.rating,
        iconColor: 'text-amber-600',
        iconBg: 'bg-amber-50',
      },
      {
        key: 'cancelled',
        label: t('profile_page.stat_cancellations'),
        value: String(cancelledCount),
        icon: PROFILE_STAT_ICONS.cancelled,
        iconColor: 'text-orange-600',
        iconBg: 'bg-orange-50',
      },
    ];
  }, [
    isHelper,
    t,
    completedCount,
    acceptedApplications,
    reviewCount,
    publishedCount,
    cancelledCount,
    profile?.rating,
  ]);

  const previewIndicators = useMemo(() => {
    const items = [
      {
        key: 'photo',
        label: t('profile_page.indicator_photo'),
        active: Boolean(avatarUrl),
      },
      {
        key: 'bio',
        label: t('profile_page.indicator_bio'),
        active: Boolean(profile?.bio?.trim()),
      },
      {
        key: 'location',
        label: t('profile_page.indicator_location'),
        active: Boolean(city?.trim()),
      },
    ];
    if (isHelper) {
      items.push({
        key: 'categories',
        label: t('profile_page.indicator_categories'),
        active: Boolean(profile?.primary_category),
      });
    }
    if (profile?.phone?.trim()) {
      items.push({
        key: 'phone',
        label: t('profile_page.indicator_phone'),
        active: true,
      });
    }
    return items;
  }, [t, avatarUrl, profile?.bio, city, isHelper, profile?.primary_category, profile?.phone]);

  const selfJobStub: Job | null =
    !isHelper && profile
      ? {
          id: 'self-preview',
          clientId: profile.id,
          clientName: displayName,
          clientAvatar: avatarUrl,
          clientRating: profile.rating ?? undefined,
          city: city ?? undefined,
          region: region ?? undefined,
          location: [city, region].filter(Boolean).join(', '),
          title: '',
          description: '',
          category: 'other',
          date: '',
          value: '',
          urgency: 'normal',
          status: 'open',
          createdAt: Date.now(),
        }
      : null;

  const showCredits =
    (isHelper && UI_VISIBILITY.helperCredits) || (!isHelper && UI_VISIBILITY.clientCredits);

  return (
    <AppPageShell wide className="w-full bg-[#F4F7FC] !px-0 !pt-0">

      <div
        data-testid="profile-dashboard-v2"
        className="flex w-full flex-col pb-28 md:pb-10"
      >

        <div className="relative">
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 mx-auto hidden w-full max-w-6xl items-center justify-between gap-3 px-8 pt-4 lg:flex [&>*]:pointer-events-auto">
            <DesktopBackButton alwaysVisible />
            <CloseToHomeButton />
          </div>
          <ProfileIdentityHero
            name={displayName}
            email={email}
            avatarUrl={avatarUrl}
            roleLabel={roleLabel}
            userType={userType}
            city={city}
            region={region}
            rating={profile?.rating}
            reviewCount={reviewCount}
            onViewPublic={() => setPublicOpen(true)}
            viewPublicLabel={t('profile_page.view_public')}
            noReviewsLabel={t('profile_page.no_reviews_yet')}
            reviewsCountLabel={(count) => t('profile_page.reviews_count', { count })}
          />
        </div>

        <ProfileGamificationSection userType={userType} />
        <div className="mx-auto mt-5 flex w-full max-w-lg flex-col gap-4 px-4 sm:px-5">

        {showCredits ? (
          <ProfileLinkCreditsCard
            balance={creditsAmount}
            loading={creditsLoading}
            usedThisMonth={!isHelper ? usedThisMonth : null}
            buyRoute={isHelper ? ROUTES.helperLinkCredits : ROUTES.clientCredits}
            historyRoute={isHelper ? ROUTES.helperCredits : ROUTES.clientCredits}
            showBuy={
              isHelper ? UI_VISIBILITY.helperCreditPurchase : UI_VISIBILITY.clientCredits
            }
          />
        ) : null}

        <ProfileStatsGrid items={stats} />

        {showCredits ? (
          <ProfileRecentActivity
            role={isHelper ? 'helper' : 'client'}
            onMonthMetrics={!isHelper ? onMonthMetrics : undefined}
          />
        ) : null}

        <PublicProfilePreviewCard
          title={t('profile_page.section_public_preview')}
          subtitle={t('profile_page.section_public_preview_sub')}
          name={displayName}
          email={email}
          avatarUrl={avatarUrl}
          roleLabel={roleLabel}
          levelName={levelName}
          heroKey={heroKey}
          userType={userType}
          city={city}
          region={region}
          rating={profile?.rating}
          reviewCount={reviewCount}
          noReviewsLabel={t('profile_page.no_reviews_yet')}
          reviewsCountLabel={(count) => t('profile_page.reviews_count', { count })}
          indicators={previewIndicators}
          editLabel={t('profile_page.edit_public')}
          viewLabel={t('profile_page.view_public')}
          onEdit={() => navigate(ROUTES.profilePublicEdit)}
          onView={() => setPublicOpen(true)}
        />

        <ProfileQuickActions
          title={t('profile_page.section_shortcuts')}
          role={isHelper ? 'helper' : 'client'}
          labels={{
            buyCredits: t('profile_page.shortcut_buy_credits'),
            myRequests: t('profile_page.shortcut_my_requests'),
            myApplications: t('profile_page.shortcut_my_applications'),
            myReviews: t('profile_page.shortcut_my_reviews'),
            portfolio: t('profile_page.shortcut_portfolio'),
            help: t('profile_page.shortcut_help'),
            settings: t('profile_page.shortcut_settings'),
          }}
        />
      </div>
        </div>

      <PublicProfileSheetFrame open={publicOpen} onClose={() => setPublicOpen(false)} panelClassName="md:max-w-2xl">
        <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[1.75rem] bg-transparent shadow-2xl">
          <div
            {...{ [PUBLIC_PROFILE_SCROLL_ATTR]: '' }}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1 sm:p-2"
          >
            {isHelper && profile ? (
              <HelperPublicProfileView
                helper={{
                  id: profile.id,
                  name: displayName,
                  avatar: avatarUrl,
                  rating: profile.rating ?? 0,
                  jobsCompleted: completedCount,
                  bio: profile.bio ?? undefined,
                  city: [city, region].filter(Boolean).join(', ') || undefined,
                  onCta: () => navigate(ROUTES.helperJobs),
                  ctaLabel: t('profile_page.public_cta_services'),
                  categories: [
                    ...(profile.primary_category ? [profile.primary_category] : []),
                    ...((profile.secondary_categories as string[] | null) ?? []),
                  ],
                }}
                onClose={() => setPublicOpen(false)}
                closeLabel={t('common.close')}
              />
            ) : selfJobStub ? (
              <ClientPublicProfileView
                job={selfJobStub}
                bio={profile?.bio}
                onClose={() => setPublicOpen(false)}
                closeLabel={t('common.close')}
                onCta={() => navigate(ROUTES.clientJobs)}
                ctaLabel={t('profile_page.public_cta_orders')}
              />
            ) : null}
          </div>
        </div>
      </PublicProfileSheetFrame>
    </AppPageShell>
  );
}
