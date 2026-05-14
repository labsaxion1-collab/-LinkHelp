import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { searchQuebecPlaces, QUEBEC_PLACES, type QuebecPlace } from '@/data/quebecRegions';

type Props = {
  id?: string;
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  onPickPlace: (place: QuebecPlace) => void;
  disabled?: boolean;
  placeholder?: string;
};

export function CityRegionAutocomplete({
  id: idProp,
  label,
  value,
  onChangeText,
  onPickPlace,
  disabled,
  placeholder,
}: Props) {
  const autoId = useId();
  const listId = `${autoId}-list`;
  const inputId = idProp ?? `${autoId}-input`;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => {
    if (!value.trim()) return QUEBEC_PLACES.slice(0, 6);
    return searchQuebecPlaces(value, 8);
  }, [value]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const runSearch = useCallback(() => {
    setLoading(true);
    window.setTimeout(() => setLoading(false), 120);
  }, []);

  useEffect(() => {
    if (open) runSearch();
  }, [value, open, runSearch]);

  const pick = (p: QuebecPlace) => {
    onPickPlace(p);
    onChangeText(p.label);
    setOpen(false);
    setActive(0);
  };

  return (
    <div ref={wrapRef} className="relative">
      <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          type="text"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          disabled={disabled}
          value={value}
          onChange={(e) => {
            onChangeText(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) setOpen(true);
            if (!open) return;
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((i) => Math.min(i + 1, suggestions.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (e.key === 'Enter' && suggestions[active]) {
              e.preventDefault();
              pick(suggestions[active]);
            } else if (e.key === 'Escape') {
              setOpen(false);
            }
          }}
          placeholder={placeholder}
          className="block w-full appearance-none rounded-xl border border-gray-200 pl-10 pr-3 py-3 placeholder-gray-400 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm bg-gray-50/50 hover:bg-gray-50 transition-colors disabled:opacity-60"
        />
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
        {loading ? (
          <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" aria-hidden />
        ) : null}
      </div>
      {open && suggestions.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-gray-200 bg-white py-1 shadow-xl shadow-slate-900/10 animate-in fade-in zoom-in-95 duration-150"
        >
          {suggestions.map((p, idx) => (
            <li key={p.label} role="option" aria-selected={idx === active}>
              <button
                type="button"
                className={clsx(
                  'flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm transition-colors',
                  idx === active ? 'bg-primary-50 text-primary-900' : 'text-gray-800 hover:bg-gray-50',
                )}
                onMouseEnter={() => setActive(idx)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(p)}
              >
                <span className="font-semibold">{p.city}</span>
                <span className="text-gray-500">{p.province}, {p.country}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
