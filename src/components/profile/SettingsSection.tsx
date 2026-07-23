import type { ReactNode } from 'react';

type Props = {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  id?: string;
  description?: string;
};

export function SettingsSection({ icon, title, children, id, description }: Props) {
  return (
    <section id={id} className="rounded-[1.5rem] border border-slate-200/90 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.045)] sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h2 className="text-base font-black text-slate-950">{title}</h2>
      </div>
      {description ? (
        <p className="mb-3 text-xs font-medium leading-relaxed text-slate-500">{description}</p>
      ) : null}
      {children}
    </section>
  );
}
