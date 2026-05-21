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
  textClassName = 'text-xl',
}: {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
}) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <LogoIcon className={`${iconClassName} shrink-0`} />
      <span className={`font-display font-black leading-none tracking-normal ${textClassName}`} aria-label="LinkHelp">
        <span className="text-slate-950">Link</span>
        <span className="text-primary-600">Help</span>
      </span>
    </div>
  );
}
