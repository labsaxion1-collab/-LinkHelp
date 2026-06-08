import { LogoIcon } from '@/components/ui/Logo';

/** Lightweight route transition loader for React.Suspense */
export function PageLoader() {
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#f7f8fc]">
      {/* Radial background glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 42%, rgba(37,99,255,0.10) 0%, transparent 58%), radial-gradient(circle at 50% 42%, rgba(56,189,248,0.07) 0%, transparent 72%)',
        }}
        aria-hidden
      />

      {/* Pulse rings */}
      <div className="relative flex items-center justify-center" aria-hidden>
        <span className="absolute h-28 w-28 animate-[lhPulseRing_2.4s_ease-out_infinite] rounded-full border border-blue-300/30" />
        <span className="absolute h-20 w-20 animate-[lhPulseRing_2.4s_ease-out_0.6s_infinite] rounded-full border border-blue-400/25" />
        {/* Logo chip */}
        <span className="relative flex h-14 w-14 items-center justify-center rounded-[1.3rem] border border-blue-100 bg-white shadow-[0_12px_36px_rgba(37,99,255,0.16),0_2px_8px_rgba(37,99,255,0.08)]">
          <LogoIcon className="h-8 w-8" />
        </span>
      </div>

      {/* Brand name */}
      <div className="mt-6 flex items-baseline gap-0.5">
        <span
          className="font-display text-[1.45rem] font-black leading-none tracking-tight text-[#0B1220]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Link
        </span>
        <span
          className="font-display text-[1.45rem] font-black leading-none tracking-tight text-[#2563FF]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Help
        </span>
      </div>

      {/* Loading bar */}
      <div className="mt-5 h-[3px] w-24 overflow-hidden rounded-full bg-blue-100">
        <div className="h-full w-full origin-left animate-[lhLoadBar_1.6s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-[#2563FF] to-[#38BDF8]" />
      </div>
    </div>
  );
}
