import React from 'react';

export function LogoIcon({ className = "w-8 h-8" }: { className?: string }) {
  const gradientId = React.useId();
  const bgGradientId = React.useId();
  return (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <rect x="4" y="4" width="112" height="112" rx="28" fill={`url(#${bgGradientId})`} />
      <path d="M22 35H46" stroke={`url(#${gradientId})`} strokeWidth="10" strokeLinecap="round" />
      <path d="M12 55H42" stroke={`url(#${gradientId})`} strokeWidth="10" strokeLinecap="round" />
      <path d="M22 75H46" stroke={`url(#${gradientId})`} strokeWidth="10" strokeLinecap="round" />
      <path
        d="M51 20A43 43 0 1 1 51 100"
        stroke={`url(#${gradientId})`}
        strokeWidth="12"
        strokeLinecap="round"
      />
      <path d="M69 41V64L84 77" stroke="white" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="91" cy="83" r="23" fill={`url(#${gradientId})`} />
      <path
        d="M91 68V98M99 74.5C97.5 71.5 94.7 70 91 70C86.8 70 84 72.4 84 75.8C84 80 88.4 81.4 91.3 82.2C95.2 83.4 99 84.8 99 89.2C99 92.8 96.1 95 91 95C86.9 95 83.8 93.3 82 90"
        stroke="#07111F"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id={bgGradientId} x1="4" y1="4" x2="116" y2="116" gradientUnits="userSpaceOnUse">
          <stop stopColor="#07111F" />
          <stop offset="0.62" stopColor="#0B1828" />
          <stop offset="1" stopColor="#111827" />
        </linearGradient>
        <linearGradient id={gradientId} x1="12" y1="18" x2="110" y2="102" gradientUnits="userSpaceOnUse">
          <stop stopColor="#17A8FF" />
          <stop offset="1" stopColor="#1565FF" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function Logo({ 
  className = "", 
  iconClassName = "w-8 h-8", 
  textClassName = "text-xl" 
}: { 
  className?: string;
  iconClassName?: string;
  textClassName?: string;
}) {
  return (
    <div className={`relative -my-2 -ml-3 inline-flex h-[56px] items-center overflow-hidden pl-3 pr-10 ${className}`}>
      <div className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-[#07111F] via-[#0B1828] via-60% to-white" />
      <div className="absolute inset-y-0 left-0 w-3/4 bg-[radial-gradient(circle_at_38%_50%,rgba(21,101,255,0.2),transparent_58%)]" />
      <div className="relative z-10 inline-flex items-center gap-1.5 rounded-xl bg-[#07111F]/35 px-1.5 py-1">
      <LogoIcon className={iconClassName} />
      <span className={`tracking-tight font-display ${textClassName}`}>
        <span className="text-white font-black">Link</span>
        <span className="text-[#1565FF] font-bold">Help</span>
      </span>
      </div>
    </div>
  );
}
