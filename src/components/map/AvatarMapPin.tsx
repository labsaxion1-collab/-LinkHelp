import { clsx } from 'clsx';
import { avatarUrlForName, initialsForName } from '@/utils/avatarUrl';

type Props = {
  name: string;
  avatarUrl?: string | null;
  urgent?: boolean;
  variant?: 'helper' | 'client';
};

const PIN_SIZE_NORMAL = 40;
const PIN_SIZE_HIGHLIGHT = 48;
export function AvatarMapPin({
  name,
  avatarUrl,
  urgent = false,
  variant = 'helper',
  highlighted = false,
}: Props & { highlighted?: boolean }) {
  const displayName = name.trim() || '?';
  const avatar = avatarUrl?.trim();
  const initials = initialsForName(displayName);
  const borderClass =
    variant === 'client' && urgent
      ? 'border-red-500 ring-red-300/60'
      : 'border-blue-600 ring-blue-200/80';
  const size = highlighted || urgent ? PIN_SIZE_HIGHLIGHT : PIN_SIZE_NORMAL;

  return (
    <div
      className={clsx(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 bg-white shadow-md ring-2',
        borderClass,
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
        <span className="text-[11px] font-black tracking-tight text-blue-900">{initials}</span>
      )}
      {urgent ? (
        <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full border border-white bg-red-500" />
      ) : null}
    </div>
  );
}
