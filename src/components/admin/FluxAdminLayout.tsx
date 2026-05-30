import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import { FluxAdminSidebar } from '@/components/admin/FluxAdminSidebar';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/utils/constants';
import { LogOut } from 'lucide-react';

export function FluxAdminLayout() {
  const { session, signOut } = useAuth();
  const { t } = useLanguage();
  const [activeSection, setActiveSection] = useState<'overview' | 'insights' | 'categories'>('overview');

  return (
    <div className="flux-admin-root fixed inset-0 z-[200] flex min-h-dvh bg-[#060912] text-slate-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-violet-600/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-blue-600/10 blur-3xl" />
      </div>

      <FluxAdminSidebar activeSection={activeSection} onSectionChange={setActiveSection} />

      <div className="relative flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between border-b border-white/8 bg-[#0B0F19]/80 px-6 py-4 backdrop-blur-xl">
          <div>
            <h1 className="text-lg font-black text-white">{t('flux_admin.header_title')}</h1>
            <p className="text-xs font-medium text-slate-500">{t('flux_admin.header_sub')}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs font-semibold text-slate-400 sm:inline">
              {session?.user?.email}
            </span>
            <Link
              to={ROUTES.home}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              {t('flux_admin.back_to_app')}
            </Link>
            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-300 transition-colors hover:bg-red-500/10 hover:text-red-300"
            >
              <LogOut className="h-3.5 w-3.5" />
              {t('flux_admin.sign_out')}
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
