import type { ElementType } from 'react';
import * as Icons from 'lucide-react';
import type { LinkCreditPackage } from '@/config/linkCreditPackages';
import { BRAND } from '@/utils/brandAssets';

export function packageTitleClass(packageId: string): string {
  const titleBase = 'bg-clip-text text-transparent drop-shadow-[0_0_14px_rgba(37,99,255,0.18)]';

  switch (packageId) {
    case 'starter':
      return `${titleBase} bg-gradient-to-r from-sky-500 via-blue-600 to-cyan-400`;
    case 'popular':
      return `${titleBase} bg-gradient-to-r from-emerald-500 via-green-600 to-lime-400 drop-shadow-[0_0_14px_rgba(34,197,94,0.22)]`;
    case 'pro':
      return `${titleBase} bg-gradient-to-r from-violet-500 via-purple-600 to-fuchsia-500 drop-shadow-[0_0_14px_rgba(168,85,247,0.24)]`;
    case 'power':
      return `${titleBase} bg-gradient-to-r from-rose-500 via-red-600 to-orange-500 drop-shadow-[0_0_14px_rgba(239,68,68,0.24)]`;
    default:
      return 'text-slate-950';
  }
}

export function packageArtwork(packageId: string): string | null {
  switch (packageId) {
    case 'starter':
      return BRAND.linkCreditCoin;
    case 'popular':
      return BRAND.linkCreditPopular;
    case 'pro':
      return BRAND.linkCreditPro;
    case 'power':
      return BRAND.linkCreditPower;
    default:
      return null;
  }
}

export function packageArtworkClass(packageId: string): string {
  const base =
    'max-h-20 max-w-full object-contain object-center drop-shadow-[0_14px_18px_rgba(180,83,9,0.22)] transition duration-500 group-hover:-translate-y-0.5 sm:max-h-none sm:h-24';

  switch (packageId) {
    case 'starter':
      return `${base} w-[4.5rem] scale-[0.72] sm:w-[5.25rem] sm:scale-[0.68] sm:group-hover:scale-[0.72]`;
    case 'popular':
      return `${base} w-[9.5rem] scale-[1.28] group-hover:scale-[1.34] sm:w-[9.8rem] sm:scale-[1.48] sm:group-hover:scale-[1.54]`;
    case 'pro':
      return `${base} w-[10rem] scale-[1.22] group-hover:scale-[1.28] sm:w-[10.4rem] sm:scale-[1.38] sm:group-hover:scale-[1.44]`;
    case 'power':
      return `${base} w-[10.5rem] scale-[1.26] group-hover:scale-[1.32] sm:w-[10.8rem] sm:scale-[1.42] sm:group-hover:scale-[1.48]`;
    default:
      return `${base} w-full group-hover:scale-[1.04]`;
  }
}

function packageAccent(packageId: string): string {
  switch (packageId) {
    case 'starter':
      return 'from-blue-500/14 via-sky-400/5 to-transparent';
    case 'popular':
      return 'from-emerald-500/14 via-green-400/5 to-transparent';
    case 'pro':
      return 'from-violet-500/14 via-fuchsia-400/5 to-transparent';
    case 'power':
      return 'from-rose-500/14 via-red-400/5 to-transparent';
    default:
      return 'from-slate-500/10 to-transparent';
  }
}

type LinkCreditPackageStoreCardProps = {
  pkg: LinkCreditPackage;
  label: string;
  badge: string | null;
  brandName: string;
  buyLabel: string;
  imageAlt: string;
  busy: boolean;
  disabled: boolean;
  onBuy: () => void;
};

export function LinkCreditPackageStoreCard({
  pkg,
  label,
  badge,
  brandName,
  buyLabel,
  imageAlt,
  busy,
  disabled,
  onBuy,
}: LinkCreditPackageStoreCardProps) {
  const artwork = packageArtwork(pkg.id);

  return (
    <article className="group relative rounded-[1.35rem] border border-white/85 bg-white/88 px-4 py-4 shadow-[0_14px_38px_rgba(92,67,16,0.10)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_48px_rgba(92,67,16,0.15)] sm:px-5 sm:py-5">
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-r ${packageAccent(pkg.id)} opacity-80`} />
      <div className="pointer-events-none absolute right-[22%] top-1/2 hidden h-24 w-24 -translate-y-1/2 rounded-full bg-amber-300/10 blur-2xl transition group-hover:bg-amber-300/20 sm:block" />

      {badge ? (
        <div className="absolute inset-x-0 top-0 z-20 flex justify-center">
          <span className="rounded-b-full bg-[#245BFF] px-3 py-1 text-[9px] font-black uppercase tracking-wide text-white shadow-[0_4px_12px_rgba(36,91,255,0.35)]">
            {badge}
          </span>
        </div>
      ) : null}

      <div className="relative flex flex-col gap-4 sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(8.4rem,0.95fr)_minmax(0,1fr)] sm:items-center sm:gap-5">
        <div className="relative z-10 flex min-w-0 items-end justify-between gap-3 sm:block">
          <div className="ml-2 min-w-0">
            <h2 className={`text-xl font-black sm:text-2xl ${packageTitleClass(pkg.id)}`}>{label}</h2>
            <p className="mt-2 whitespace-nowrap bg-gradient-to-b from-[#FFE36A] via-[#F3B51B] to-[#C98508] bg-clip-text text-[2.75rem] font-black leading-none tracking-tight text-transparent drop-shadow-[0_0_16px_rgba(217,169,40,0.28)] sm:text-6xl">
              {pkg.credits}
            </p>
            <p className="mt-1.5 whitespace-nowrap text-[11px] font-black text-black sm:text-sm">{brandName}</p>
          </div>

          <div className="relative z-0 flex shrink-0 items-center justify-center overflow-visible sm:hidden">
            {artwork ? (
              <img
                src={artwork}
                alt={imageAlt}
                className={packageArtworkClass(pkg.id)}
                loading="lazy"
                decoding="async"
              />
            ) : null}
          </div>
        </div>

        <div className="relative z-0 hidden min-w-0 items-center justify-center overflow-visible sm:flex">
          {artwork ? (
            <img
              src={artwork}
              alt=""
              aria-hidden
              className={packageArtworkClass(pkg.id)}
              loading="lazy"
              decoding="async"
            />
          ) : null}
        </div>

        <div className="relative z-10 min-w-0 border-t border-slate-200/80 pt-3 text-center sm:border-l sm:border-t-0 sm:bg-white/20 sm:pl-6 sm:pt-0 sm:text-left">
          <p className="whitespace-nowrap text-[15px] font-black leading-tight text-[#071238] drop-shadow-[0_8px_18px_rgba(7,18,56,0.10)] sm:text-xl">
            {pkg.currency} ${pkg.price.toFixed(2)}
          </p>
          <button
            type="button"
            disabled={disabled}
            onClick={onBuy}
            className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[1rem] bg-gradient-to-r from-[#071238] to-[#02102D] px-4 text-[13px] font-black text-white shadow-[0_10px_22px_rgba(7,18,56,0.20)] transition hover:scale-[1.02] hover:brightness-125 disabled:opacity-60 sm:min-h-[50px] sm:text-sm"
          >
            {busy ? (
              <Icons.Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Icons.ShoppingCart className="h-4 w-4 shrink-0" />
            )}
            <span>{buyLabel}</span>
          </button>
        </div>
      </div>
    </article>
  );
}

export function LinkCreditStoreTrustSection({
  items,
}: {
  items: { label: string; icon: ElementType }[];
}) {
  return (
    <section className="grid grid-cols-3 divide-x divide-slate-100 rounded-[1.75rem] border border-black/[0.04] bg-white/90 px-4 py-5 shadow-[0_12px_34px_rgba(15,23,42,0.05)] backdrop-blur-sm">
      {items.map((benefit) => {
        const Icon = benefit.icon;
        return (
          <div key={benefit.label} className="flex min-w-0 flex-col items-center px-2 text-center">
            <Icon className="h-5 w-5 text-[#D9A928] drop-shadow-[0_0_10px_rgba(217,169,40,0.28)]" />
            <p className="mt-1.5 text-[9px] font-black uppercase leading-tight text-black">{benefit.label}</p>
          </div>
        );
      })}
    </section>
  );
}
