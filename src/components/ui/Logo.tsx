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
  iconClassName = 'w-8 h-8',
  textClassName = 'text-xl',
}: {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
}) {
  const heightClass = iconClassName.includes('w-12') || iconClassName.includes('h-12') ? 'h-14' : 'h-12';

  return (
    <div className={`inline-flex items-center ${className}`}>
      <img
        src="/brand/linkhelp-logo.png"
        alt="LinkHelp"
        className={`${heightClass} w-auto object-contain`}
      />
      <span className={`sr-only ${textClassName}`}>LinkHelp</span>
    </div>
  );
}
