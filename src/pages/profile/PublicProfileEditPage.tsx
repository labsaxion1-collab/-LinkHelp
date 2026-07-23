import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { AppPageShell } from '@/components/design-system/AppPageShell';
import { DesktopBackButton } from '@/components/layout/DesktopBackButton';
import { PublicProfilePreviewCard } from '@/components/profile/PublicProfilePreviewCard';
import { HelperCategoriesManager } from '@/components/helper/HelperCategoriesManager';
import { useAuth } from '@/context/AuthContext';
import { useAppMode } from '@/context/AppModeContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { useGamification } from '@/gamification/hooks/useGamification';
import { getCurrentLevelConfig } from '@/gamification/engines/levelEngine';
import { getSpokenLanguageLabel, SPOKEN_LANGUAGES } from '@/data/spokenLanguages';
import { type ServiceCategoryId } from '@/data/serviceCategories';
import { filterValidSkillKeys } from '@/data/helperSkillsCatalog';
import { fetchHelperSkills, syncHelperSkills } from '@/services/supabase/helperSkillsRemote';
import {
  deriveHelperCategoriesFromSkillKeys,
  getHelperCategoryPreferences,
} from '@/utils/helperCategoryPreferences';
import { extractErrorMessage, formatAuthFlowErrorMessage } from '@/utils/errorMessage';
import { ROUTES } from '@/utils/constants';
import { useAppData } from '@/context/AppDataContext';

export default function PublicProfileEditPage() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, session, updateProfile, refreshProfile, isConfigured } = useAuth();
  const { isHelperMode } = useAppMode();
  const { showToast } = useToast();
  const { reviews } = useAppData();
  const isHelper = profile?.role === 'helper' || isHelperMode;
  const userType = isHelper ? 'helper' : 'client';
  const { record } = useGamification(userType);

  const [bio, setBio] = useState('');
  const [spokenLanguages, setSpokenLanguages] = useState<string[]>([]);
  const [helperSkillIds, setHelperSkillIds] = useState<string[]>([]);
  const [primaryCategory, setPrimaryCategory] = useState<ServiceCategoryId>('cleaning');
  const [secondaryCategories, setSecondaryCategories] = useState<ServiceCategoryId[]>([]);
  const [saving, setSaving] = useState(false);
  const categoriesSectionRef = useRef<HTMLElement | null>(null);

  const email = session?.user.email ?? profile?.email ?? '';
  const displayName = profile?.name?.trim() || email || 'LinkHelp';
  const avatarUrl = profile?.avatar_url?.trim() || '';
  const city = isHelper ? profile?.helper_base_city ?? profile?.city : profile?.city;
  const region = isHelper ? profile?.helper_base_province ?? profile?.region : profile?.region;
  const roleLabel = isHelper
    ? t('app_pages.settings_mode_helper')
    : t('app_pages.settings_mode_client');
  const levelName = getCurrentLevelConfig(userType, record?.levelKey ?? 'novo').name;
  const heroKey = record?.heroKey ?? `${userType}_novo`;
  const reviewCount = useMemo(() => {
    if (!profile?.id) return 0;
    return reviews.filter((r) => r.targetUserId === profile.id).length;
  }, [profile?.id, reviews]);

  useEffect(() => {
    if (!profile) return;
    setBio(profile.bio?.trim() ?? '');
    setSpokenLanguages(
      Array.isArray(profile.spoken_languages) && profile.spoken_languages.length
        ? profile.spoken_languages
        : profile.preferred_language
          ? [profile.preferred_language]
          : [language],
    );
  }, [profile, language]);

  useEffect(() => {
    if (!profile || !isHelper) return;
    const prefs = getHelperCategoryPreferences(profile, helperSkillIds);
    setPrimaryCategory(prefs.primaryCategory);
    setSecondaryCategories(prefs.secondaryCategories);
  }, [profile, isHelper, helperSkillIds]);

  useEffect(() => {
    if (!session?.user?.id || !isHelper || !isConfigured) {
      setHelperSkillIds([]);
      return;
    }
    void fetchHelperSkills(session.user.id).then(setHelperSkillIds);
  }, [session?.user?.id, isHelper, isConfigured]);

  useEffect(() => {
    if (location.hash !== '#helper-categories' || !categoriesSectionRef.current) return;
    const timer = setTimeout(() => {
      categoriesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
    return () => clearTimeout(timer);
  }, [location.hash]);

  const completionItems = useMemo(() => {
    const items = [
      { key: 'photo', label: t('profile_page.indicator_photo'), done: Boolean(avatarUrl) },
      { key: 'bio', label: t('profile_page.indicator_bio'), done: Boolean(bio.trim()) },
      { key: 'location', label: t('profile_page.indicator_location'), done: Boolean(city?.trim()) },
    ];
    if (isHelper) {
      items.push({
        key: 'categories',
        label: t('profile_page.indicator_categories'),
        done: helperSkillIds.length > 0 || Boolean(profile?.primary_category),
      });
    }
    return items;
  }, [t, avatarUrl, bio, city, isHelper, helperSkillIds.length, profile?.primary_category]);

  const completionPct = Math.round(
    (completionItems.filter((item) => item.done).length / Math.max(1, completionItems.length)) * 100,
  );

  const persistHelperSkills = async (
    ids: string[],
    categoryOverride?: { primary: ServiceCategoryId; secondary: ServiceCategoryId[] },
  ) => {
    const valid = filterValidSkillKeys(ids);
    setHelperSkillIds(valid);
    const { primary, secondary } =
      categoryOverride ?? deriveHelperCategoriesFromSkillKeys(valid, primaryCategory);
    setPrimaryCategory(primary);
    setSecondaryCategories(secondary);
    if (!session?.user?.id || !isConfigured) return;
    await syncHelperSkills(session.user.id, valid);
    const err = await updateProfile({
      primary_category: primary,
      secondary_categories: secondary,
    });
    if (err) throw new Error(formatAuthFlowErrorMessage(t, err));
    await refreshProfile();
  };

  const savePublicProfile = async () => {
    if (!isConfigured || !profile) {
      showToast(t('app_pages.settings_saved'), 'info');
      return;
    }
    setSaving(true);
    try {
      if (isHelper) {
        await persistHelperSkills(helperSkillIds, {
          primary: primaryCategory,
          secondary: secondaryCategories,
        });
      }
      const err = await updateProfile(
        isHelper
          ? {
              bio: bio.trim() || null,
              spoken_languages: spokenLanguages.length ? spokenLanguages : [language],
            }
          : {
              bio: bio.trim() || null,
            },
      );
      if (err) {
        showToast(formatAuthFlowErrorMessage(t, err), 'error');
        return;
      }
      await refreshProfile();
      showToast(t('app_pages.settings_saved'), 'success');
    } catch (e) {
      showToast(extractErrorMessage(e, t('helper_categories.save_error')), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppPageShell className="w-full">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-1 pb-28 md:pb-10">
        <DesktopBackButton />
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-900 lg:hidden"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('nav.back')}
        </button>

        <header>
          <h1 className="text-2xl font-black tracking-tight text-slate-950">
            {t('profile_page.public_edit_title')}
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            {t('profile_page.public_edit_sub')}
          </p>
        </header>

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
          indicators={completionItems.map((item) => ({
            key: item.key,
            label: item.label,
            active: item.done,
          }))}
          editLabel={t('app_pages.settings_avatar_choose')}
          viewLabel={t('profile_page.view_public')}
          onEdit={() => navigate(`${ROUTES.settings}#avatar`)}
          onView={() => navigate(ROUTES.profile)}
        />

        <section className="rounded-[1.5rem] border border-slate-200/90 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.045)]">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-black text-slate-950">
              {t('profile_page.public_edit_progress')}
            </h2>
            <span className="text-sm font-black tabular-nums text-[#2563FF]">{completionPct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[#2563FF] transition-[width]"
              style={{ width: `${completionPct}%` }}
            />
          </div>
          <ul className="mt-3 space-y-1.5">
            {completionItems.map((item) => (
              <li
                key={item.key}
                className={`text-xs font-semibold ${item.done ? 'text-emerald-700' : 'text-slate-500'}`}
              >
                {item.done ? '✓' : '○'} {item.label}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-[1.5rem] border border-slate-200/90 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.045)]">
          <label className="block text-sm font-bold text-slate-800">
            {t('profile_page.bio_label')}
            <textarea
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={t('profile_page.bio_placeholder')}
              className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </label>
        </section>

        {isHelper ? (
          <>
            <section className="rounded-[1.5rem] border border-slate-200/90 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.045)]">
              <p className="mb-2 text-sm font-bold text-slate-800">
                {t('app_pages.settings_spoken_languages')}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {SPOKEN_LANGUAGES.map((option) => {
                  const active = spokenLanguages.includes(option.code);
                  return (
                    <button
                      key={option.code}
                      type="button"
                      onClick={() =>
                        setSpokenLanguages((prev) =>
                          prev.includes(option.code)
                            ? prev.filter((id) => id !== option.code)
                            : [...prev, option.code],
                        )
                      }
                      className={`rounded-xl border px-3 py-2 text-sm font-bold transition-colors ${
                        active
                          ? 'border-blue-600 bg-blue-50 text-blue-900'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
                      }`}
                    >
                      {getSpokenLanguageLabel(option.code, t)}
                    </button>
                  );
                })}
              </div>
            </section>

            <section
              id="helper-categories"
              ref={categoriesSectionRef}
              className="rounded-[1.5rem] border border-slate-200/90 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.045)]"
            >
              <h2 className="mb-1 text-sm font-black text-slate-950">{t('helper_categories.title')}</h2>
              <p className="mb-3 text-xs font-medium text-slate-500">
                {t('profile_page.helper_specialties_subtitle')}
              </p>
              <HelperCategoriesManager
                t={t}
                skillIds={helperSkillIds}
                primaryCategory={primaryCategory}
                secondaryCategories={secondaryCategories}
                onSkillsChange={setHelperSkillIds}
                onCategoriesChange={(primary, secondary) => {
                  setPrimaryCategory(primary);
                  setSecondaryCategories(secondary);
                }}
                onSaveAsync={persistHelperSkills}
                iconOnlySummary
              />
            </section>

            <Link
              to={ROUTES.helperDashboard}
              className="inline-flex min-h-[46px] items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              {t('profile_page.public_edit_portfolio_link')}
            </Link>
          </>
        ) : null}

        <button
          type="button"
          disabled={saving || !isConfigured}
          onClick={() => void savePublicProfile()}
          className="inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-[#2563FF] px-4 text-sm font-black text-white shadow-[0_12px_28px_rgba(37,99,255,0.28)] disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          {t('profile_page.public_edit_save')}
        </button>
      </div>
    </AppPageShell>
  );
}
