import { clsx } from 'clsx';

type Option = { value: string; label: string };

type Props = {
  label: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
};

export function ChoiceChipGroup({ label, options, value, onChange, required }: Props) {
  return (
    <div className="space-y-2.5">
      <p className="text-sm font-bold text-gray-800">
        {label}
        {required ? <span className="text-rose-600"> *</span> : null}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={clsx(
                'min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-bold border-2 transition-all',
                active
                  ? 'border-blue-600 bg-blue-50 text-blue-950 shadow-sm'
                  : 'border-gray-200 bg-white text-gray-800 hover:border-gray-300 hover:bg-gray-50',
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
