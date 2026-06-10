import { clsx } from 'clsx';
import { avatarUrlForName, initialsForName } from '@/utils/avatarUrl';

type Props = {
  name: string;
  avatarUrl?: string | null;
  urgent?: boolean;
  variant?: 'helper' | 'client';
  highlighted?: boolean;
  /** Optional category color override for the border (hex / CSS color). */
  borderColor?: string;
  /** Optional category color override for the outer ring (hex / CSS color). */
  ringColor?: string;
};

const PIN_SIZE_NORMAL = 40;
const PIN_SIZE_HIGHLIGHT = 48;

export function AvatarMapPin({
  name,
  avatarUrl,
  urgent = false,
  variant = 'helper',
  highlighted = false,
  borderColor,
  ringColor,
}: Props) {
  const displayName = name.trim() || '?';
  const avatar = avatarUrl?.trim();
  const initials = initialsForName(displayName);
  const size = highlighted || urgent ? PIN_SIZE_HIGHLIGHT : PIN_SIZE_NORMAL;

  // Category color overrides take precedence; fallback to blue/red defaults.
  const useCustomColor = Boolean(borderColor);
  const defaultBorderClass =
    variant === 'client' && urgent
      ? 'border-red-500 ring-red-300/60'
      : 'border-blue-600 ring-blue-200/80';

  return (
    <div
      className={clsx(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 bg-white shadow-md',
        // Only apply Tailwind ring when NOT using custom color (to avoid class/style conflicts)
        !useCustomColor && 'ring-2',
        !useCustomColor && defaultBorderClass,
      )}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        maxWidth: size,
        maxHeight: size,
        boxSizing: 'border-box',
        transform: 'none',
        // Apply category colors via inline style when provided
        ...(useCustomColor && {
          borderColor: urgent ? '#ef4444' : borderColor,
          boxShadow: `0 0 0 3px ${urgent ? 'rgba(239,68,68,0.35)' : (ringColor ?? `${borderColor}40`)}, 0 4px 12px rgba(0,0,0,0.15)`,
        }),
      }}
    >
      {avatar ? (
        <img
          src={avatar}
          alt=""
          className="h-full w-full object-cover"
          onError={(e) => {
            const img = e.currentTarget;
            img.onerror = null;
            img.src = avatarUrlForName(displayName);
          }}
        />
      ) : (
        <span
          className="text-[11px] font-black tracking-tight"
          style={{ color: useCustomColor ? (borderColor ?? '#1e40af') : '#1e3a8a' }}
        >
          {initials}
        </span>
      )}
      {urgent ? (
        <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full border border-white bg-red-500" />
      ) : null}
    </div>
  );
}
