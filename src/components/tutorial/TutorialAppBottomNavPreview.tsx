import { ClipboardList, MapPin, MessageCircle, Plus, UserRound } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { clsx } from 'clsx';

type Props = {
  className?: string;
  /** Card 2 tutorial — shockwave pulse on the central + button */
  highlightCreateButton?: boolean;
  /** Pause animation when the slide is off-screen */
  pulseActive?: boolean;
};

export function TutorialAppBottomNavPreview({
  className,
  highlightCreateButton = false,
  pulseActive = true,
}: Props) {
  const { t } = useLanguage();

  const items: Array<{
    key: string;
    label: string;
    icon: typeof MessageCircle;
    primary?: boolean;
  }> = [
    { key: 'chat', label: t('mobile_nav.messages'), icon: MessageCircle },
    { key: 'activities', label: t('mobile_nav.activities'), icon: ClipboardList },
    { key: 'create', label: '', icon: Plus, primary: true },
    { key: 'map', label: t('mobile_nav.map'), icon: MapPin },
    { key: 'profile', label: t('mobile_nav.profile_menu'), icon: UserRound },
  ];

  return (
    <div
        className={clsx(
          'rounded-[1.35rem] bg-white/88 px-1.5 py-1.5 shadow-[0_8px_24px_rgba(15,23,42,0.08)] ring-1 ring-white/60 backdrop-blur-md',
          className,
        )}
      aria-hidden
    >
      <ul className="flex items-end justify-between gap-0.5">
        {items.map((item) => {
          const Icon = item.icon;

          if (item.primary) {
            return (
              <li key={item.key} className="flex flex-1 justify-center overflow-visible">
                <div className="relative -mt-3.5 flex flex-col items-center overflow-visible">
                  <span className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-[1rem] bg-[#2563FF]/25 blur-md" />
                  <span
                    className={clsx(
                      'lh-tutorial-nav-plus-button relative flex h-11 w-11 items-center justify-center overflow-visible rounded-[1.05rem] border border-[#2563FF]/20 bg-[#2563FF] text-white shadow-[0_10px_24px_rgba(37,99,255,0.34),inset_0_1px_0_rgba(255,255,255,0.18)]',
                      highlightCreateButton && pulseActive && 'lh-tutorial-nav-plus-highlight',
                    )}
                  >
                    <Icon className="relative z-[1] h-5 w-5" strokeWidth={2.75} />
                  </span>
                </div>
              </li>
            );
          }

          return (
            <li key={item.key} className="flex min-w-0 flex-1 justify-center">
              <div className="flex min-h-[46px] w-full max-w-[64px] flex-col items-center justify-end gap-0.5 pb-0.5">
                <Icon className="h-[18px] w-[18px] shrink-0 text-[#94A3B8]" strokeWidth={2} />
                <span className="truncate whitespace-nowrap text-center text-[8.5px] font-bold leading-none text-[#94A3B8]">
                  {item.label}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
