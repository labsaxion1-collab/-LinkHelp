import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useHomeDashboardShell } from '@/components/home/HomeDashboardShellContext';
import { getCurrentHostProfile } from '@/utils/linkhelpHosts';
import { diagnoseSnapshotRead } from '@/utils/accountSessionSnapshot';
import { normalizeProfileRole } from '@/utils/userRole';

function isPerfDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const q = new URLSearchParams(window.location.search);
    if (q.get('perfDebug') === '1') return true;
    if (import.meta.env.DEV && q.get('perfDebug') === '0') return false;
    return import.meta.env.DEV && q.has('perfDebug');
  } catch {
    return false;
  }
}

function msSinceAppStart(): number {
  if (typeof performance === 'undefined') return -1;
  try {
    const marks = performance.getEntriesByName('lh-app-perf:app-start');
    const html = performance.getEntriesByName('lh-app-perf:html-boot');
    const t0 = marks[0]?.startTime ?? html[0]?.startTime ?? 0;
    return Math.round(performance.now() - t0);
  } catch {
    return -1;
  }
}

/**
 * Temporary Preview/DEV overlay — activate with ?perfDebug=1
 * No tokens, email, phone, or full UUIDs.
 */
export function PerfDebugPanel() {
  const enabled = useMemo(() => isPerfDebugEnabled(), []);
  const location = useLocation();
  const auth = useAuth();
  const shell = useHomeDashboardShell();
  const [tick, setTick] = useState(0);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 250);
    const onScroll = () => setScrollY(Math.round(window.scrollY));
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      window.clearInterval(id);
      window.removeEventListener('scroll', onScroll);
    };
  }, [enabled]);

  if (!enabled) return null;

  const role = auth.profile ? normalizeProfileRole(auth.profile.role) : null;
  const diag = diagnoseSnapshotRead(role);
  const snapVisible = auth.snapshotVisible;
  const shellEl = document.querySelector('[data-lh-home-shell="persistent"]');
  const snapEl = document.querySelector('[data-lh-home-shell="snapshot-paint"]');
  const dashEl = document.querySelector('[data-lh-dashboard-mounted]');
  const outletHint = Boolean(auth.sessionConfirmed && auth.profile);
  const heroPhase = snapEl
    ? 'snapshot-paint'
    : shellEl
      ? 'shell-skeleton'
      : dashEl
        ? 'dashboard-live'
        : 'pending';
  const appDataPhase = !auth.sessionConfirmed
    ? 'blocked-until-session'
    : dashEl
      ? 'live'
      : 'waiting-dashboard';

  const rows: [string, string | number | boolean | null][] = [
    ['pathname', location.pathname],
    ['hostProfile', getCurrentHostProfile()],
    ['authBootstrapped', auth.authBootstrapped],
    ['sessionConfirmed', auth.sessionConfirmed],
    ['authNetworkPending', auth.authNetworkPending],
    ['profileReady', Boolean(auth.profile?.id)],
    ['role', role],
    ['snapshotVisible', snapVisible],
    ['snapshotReadResult', diag.reason],
    ['snapshotRejectReason', diag.reason === 'accepted' ? '—' : diag.reason],
    ['snapshotAgeMs', diag.ageMs],
    ['homeConfirmedAt?', diag.homeConfirmed],
    ['storage', diag.storage],
    ['persistentShellVisible', Boolean(shellEl)],
    ['surfaceReady', shell.surfaceReady],
    ['protectedOutletMounted', outletHint],
    ['dashboardMounted', Boolean(dashEl)],
    ['snapshotPaintDom', Boolean(snapEl)],
    ['heroPhase', heroPhase],
    ['appDataPhase', appDataPhase],
    ['scrollY', scrollY],
    ['msSinceAppStart', msSinceAppStart()],
    ['tick', tick],
  ];

  return (
    <aside
      data-lh-perf-debug="1"
      className="pointer-events-none fixed bottom-2 left-2 z-[9999] max-h-[45vh] max-w-[min(96vw,22rem)] overflow-auto rounded-lg border border-lime-400/80 bg-black/85 p-2 font-mono text-[10px] leading-tight text-lime-200 shadow-xl"
    >
      <div className="mb-1 font-bold text-lime-300">perfDebug</div>
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-2 border-b border-white/5 py-0.5">
          <span className="text-white/60">{k}</span>
          <span className="text-right text-lime-100">{String(v)}</span>
        </div>
      ))}
    </aside>
  );
}
