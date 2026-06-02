import { type ReactNode, useEffect, useState } from 'react';
import { Logo } from '@/components/ui/Logo';

const SPLASH_DURATION_MS = 1200;

export function LoginSplashGate({ children }: { children: ReactNode }) {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowSplash(false), SPLASH_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, []);

  if (!showSplash) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[9999] flex min-h-dvh items-center justify-center overflow-hidden bg-[#04122A] px-6 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(37,99,255,0.36),transparent_32%),radial-gradient(circle_at_78%_72%,rgba(51,182,255,0.2),transparent_30%),linear-gradient(135deg,#071B3D_0%,#020716_100%)]" />
      <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full border border-blue-400/20 bg-blue-500/10 blur-sm" />
      <div className="pointer-events-none absolute bottom-[-8rem] right-[-5rem] h-96 w-96 rounded-full border border-cyan-300/20 bg-cyan-500/10 blur-sm" />

      <div className="relative flex flex-col items-center text-center">
        <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-[2rem] border border-white/18 bg-white/[0.08] shadow-[0_24px_80px_rgba(37,99,255,0.34)] backdrop-blur-2xl">
          <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-white/18 via-transparent to-blue-500/20" />
          <Logo className="relative justify-center" iconClassName="h-14 w-14" textClassName="hidden" tone="light" />
        </div>

        <Logo className="justify-center" iconClassName="hidden" textClassName="text-3xl" tone="light" />
        <div className="mt-8 h-1.5 w-40 overflow-hidden rounded-full bg-white/12">
          <div className="h-full w-1/2 animate-[lh-splash-load_1.2s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-[#33B6FF] to-[#2563FF] shadow-[0_0_22px_rgba(51,182,255,0.8)]" />
        </div>
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.28em] text-blue-100/80">Carregando</p>
      </div>

      <style>
        {`
          @keyframes lh-splash-load {
            0% { transform: translateX(-110%); }
            100% { transform: translateX(220%); }
          }
        `}
      </style>
    </div>
  );
}
