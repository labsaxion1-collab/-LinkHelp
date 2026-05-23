import { clsx } from 'clsx';
import { avatarUrlForName, initialsForName } from '@/utils/avatarUrl';

type Props = {
  clientName: string;
  clientAvatar?: string | null;
  urgent?: boolean;
};

export function ClientJobMapPin({ clientName, clientAvatar, urgent = false }: Props) {
  const name = clientName.trim() || '?';
  const avatar = clientAvatar?.trim();
  const initials = initialsForName(name);

  return (
    <div
      className={clsx(
        'relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 bg-white shadow-md',
        urgent ? 'border-red-500 ring-2 ring-red-300/60' : 'border-blue-600 ring-2 ring-blue-200/80',
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
            img.src = avatarUrlForName(name);
          }}
        />
      ) : (
        <span className="text-[11px] font-black tracking-tight text-blue-900">{initials}</span>
      )}
      {urgent ? (
        <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-red-500 border border-white" />
      ) : null}
    </div>
  );
}
