type SkillLine = { key: string; label: string };

type Props = {
  t: (key: string) => string;
  skills: SkillLine[];
  onEdit: () => void;
};

export function HelperProfileSkillsSection({ t, skills, onEdit }: Props) {
  return (
    <div className="mt-6 pt-6 border-t border-gray-100">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-bold text-gray-900">{t('helper_dashboard.sidebar_acc_skills')}</h4>
        <button
          type="button"
          onClick={onEdit}
          className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
        >
          {skills.length > 0 ? t('helper_dashboard.profile_edit_skills') : t('helper_dashboard.add_skill_cta')}
        </button>
      </div>
      {skills.length > 0 ? (
        <div className="flex flex-wrap gap-2 mt-3">
          {skills.map((skill) => (
            <span
              key={skill.key}
              className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-800"
            >
              {skill.label}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs text-gray-500 leading-relaxed">{t('helper_dashboard.skills_empty')}</p>
      )}
    </div>
  );
}
