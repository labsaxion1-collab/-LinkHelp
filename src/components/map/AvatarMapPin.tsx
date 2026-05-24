import { clsx } from 'clsx';
import { avatarUrlForName, initialsForName } from '@/utils/avatarUrl';

type Props = {
  name: string;
  avatarUrl?: string | null;
  urgent?: boolean;
  variant?: 'helper' | 'client';
};

export function AvatarMapPin({ name, avatarUrl, urgent = false, variant = 'helper' }: Props) {
  const displayName = name.trim() || '?';
  const avatar = avatarUrl?.trim();
  const initials = initialsForName(displayName);
  const borderClass =
    variant === 'client' && urgent
      ? 'border-red-500 ring-red-300/60'
      : 'border-blue-600 ring-blue-200/80';

  return (
    <div
      className={clsx(
        'relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 bg-white shadow-md ring-2',
        borderClass,
      )}
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
