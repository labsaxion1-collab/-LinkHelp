import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import { FluxAdminSidebar } from '@/components/admin/FluxAdminSidebar';
import { FluxBrandMark } from '@/components/brand/FluxBrandMark';
import { useAuth } from '@/context/AuthContext';
import { FLUX_PT } from '@/admin/fluxPtCopy';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/utils/constants';
import { LogOut } from 'lucide-react';

export function FluxAdminLayout() {
  const { session, signOut } = useAuth();
  const [activeSection, setActiveSection] = useState<'overview' | 'insights' | 'categories'>('overview');

  return (
    <div className="flux-admin-root fixed inset-0 z-[200] flex min-h-dvh bg-[#000000] text-slate-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-cyan-500/12 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-violet-600/14 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-[#00F2FF]/5 blur-3xl" />
      </div>

      <FluxAdminSidebar activeSection={activeSection} onSectionChange={setActiveSection} />

      <div className="relative flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between border-b border-cyan-500/10 bg-[#050508]/85 px-6 py-4 backdrop-blur-xl">
          <div className="flex min-w-0 items-center gap-4">
            <FluxBrandMark compact showTagline={false} className="md:hidden" />
            <div className="min-w-0">
              <h1 className="text-lg font-black tracking-[0.12em] text-white">FLUX</h1>
              <p className="text-xs font-medium text-cyan-300/70">{FLUX_PT.brandTagline}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs font-semibold text-slate-400 sm:inline">
              {session?.user?.email}
            </span>
            <Link
              to={ROUTES.home}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              {FLUX_PT.backToApp}
            </Link>
            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-300 transition-colors hover:bg-red-500/10 hover:text-red-300"
            >
              <LogOut className="h-3.5 w-3.5" />
              {FLUX_PT.signOut}
            </button>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6 sm:px-6 lg:px-8">
          <Outlet context={{ activeSection, setActiveSection }} />
        </main>
      </div>
    </div>
  );
}
