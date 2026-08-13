import { useNavigate } from 'react-router-dom';
import { ChevronRight, UserRound } from 'lucide-react';
import { ROUTES } from '@/utils/constants';

type Props = {
  label: string;
};

/** Compact private-account shortcut — opens Settings account section (not public profile). */
export function ProfilePersonalInfoShortcut({ label }: Props) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      data-testid="profile-personal-info-shortcut"
      onClick={() =>
        navigate(`${ROUTES.settings}#settings-account`, {
          state: { from: ROUTES.profile },
        })
      }
      className="flex w-full items-center gap-3 rounded-[1.25rem] border border-slate-200/90 bg-white px-3.5 py-3 text-left shadow-[0_8px_22px_rgba(15,23,42,0.045)] transition hover:border-blue-100 hover:bg-slate-50/80 active:scale-[0.99]"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
        <UserRound className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-slate-800">{label}</span>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
    </button>
  );
}
