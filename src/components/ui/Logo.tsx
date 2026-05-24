export function LogoIcon({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <img
      src="/brand/linkhelp-app-source.png"
      alt=""
      aria-hidden="true"
      className={`object-contain ${className}`}
    />
  );
}

export function Logo({
  className = '',
  iconClassName = 'w-10 h-10',
  iconShellClassName = '',
  textClassName = 'text-xl',
  tone = 'dark',
}: {
  className?: string;
  iconClassName?: string;
  iconShellClassName?: string;
  textClassName?: string;
  tone?: 'dark' | 'light';
}) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span className={`relative inline-flex shrink-0 items-center justify-center ${iconShellClassName}`}>
        <LogoIcon className={`${iconClassName} shrink-0`} />
      </span>
      <span className={`font-display font-black leading-none tracking-normal ${textClassName}`} aria-label="LinkHelp">
        <span className={tone === 'light' ? 'text-white' : 'text-slate-950'}>Link</span>
        <span className="text-primary-600">Help</span>
      </span>
    </div>
  );
}
