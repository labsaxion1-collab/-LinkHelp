import React from 'react';

export function LogoIcon({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="28" cy="25" r="15" fill="#4338CA" />
      <circle cx="72" cy="25" r="15" fill="#3B82F6" />
      <path 
        d="M 28 46 C 0 46 0 88 28 88 C 45 88 50 72 50 72 C 50 72 55 88 72 88 C 100 88 100 46 72 46" 
        stroke="url(#logo-grad-main)" 
        strokeWidth="20" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      <defs>
        <linearGradient id="logo-grad-main" x1="10" y1="65" x2="90" y2="65" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4338CA" />
          <stop offset="1" stopColor="#3B82F6" />
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
    <div className={`flex items-center gap-2 ${className}`}>
      <LogoIcon className={iconClassName} />
      <span className={`tracking-tight font-display ${textClassName}`}>
        <span className="text-slate-900 font-black">Link</span>
        <span className="text-blue-600 font-bold">Help</span>
      </span>
    </div>
  );
}
