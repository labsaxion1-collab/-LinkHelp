import { Link } from 'react-router-dom';
import { BACKOFFICE_PT } from '@/admin/fluxPtCopy';
import { ROUTES } from '@/utils/constants';

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

export function BackofficePageShell({ title, subtitle, children }: Props) {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="border border-cyan-500/10 bg-white/[0.03] p-5 backdrop-blur-sm">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400/80">
          {BACKOFFICE_PT.sectionLabel}
        </p>
        <h2 className="mt-1 text-xl font-black text-white">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-slate-400">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}

export function BackofficeTableShell({
  children,
  empty,
}: {
  children: React.ReactNode;
  empty?: boolean;
}) {
  if (empty) {
    return (
      <div className="border border-white/10 bg-white/[0.02] p-8 text-center text-sm text-slate-500">
        {BACKOFFICE_PT.empty}
      </div>
    );
  }
  return (
    <div className="overflow-x-auto border border-white/10 bg-white/[0.02]">{children}</div>
  );
}

export function BackofficeUserLink({ userId, label }: { userId: string; label: string }) {
  return (
    <Link
      to={ROUTES.adminUserDetail.replace(':userId', userId)}
      className="font-semibold text-cyan-300 hover:text-cyan-200 hover:underline"
    >
      {label}
    </Link>
  );
}

export function BackofficeRequestLink({ requestId, label }: { requestId: string; label: string }) {
  return (
    <Link
      to={ROUTES.adminRequestDetail.replace(':requestId', requestId)}
      className="font-semibold text-cyan-300 hover:text-cyan-200 hover:underline"
    >
      {label}
    </Link>
  );
}
