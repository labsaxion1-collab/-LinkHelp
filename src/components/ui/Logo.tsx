const LOGO_ICON_SRC = '/brand/logo icon.png';

export function LogoIcon({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <img
      src={LOGO_ICON_SRC}
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
        <span className={tone === 'light' ? 'text-white' : 'text-[#0F172A]'}>Link</span>
        <span className="text-[#2563FF]">Help</span>
      </span>
    </div>
  );
}
