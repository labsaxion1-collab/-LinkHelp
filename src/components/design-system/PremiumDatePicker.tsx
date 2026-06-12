import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  buildMonthGrid,
  dateToIso,
  formatDisplayDate,
  getMonthOptions,
  getWeekdayLabels,
  getYearOptions,
  isoToDate,
  isSameDay,
  isSameMonth,
  todayIsoLocal,
  toIntlLocale,
} from '@/utils/calendar';

type Props = {
  value: string;
  onChange: (iso: string) => void;
  minDate?: string;
  placeholder: string;
  todayLabel: string;
  clearLabel: string;
  language: string;
  ariaLabel: string;
};

const PREMIUM_FIELD_CLASS =
  'flex min-h-[72px] w-full items-center gap-3 rounded-[24px] border bg-white px-4 text-left transition-all touch-manipulation';

type PanelPosition = {
  top: number;
  left: number;
  width: number;
};

export function PremiumDatePicker({
  value,
  onChange,
  minDate = todayIsoLocal(),
  placeholder,
  todayLabel,
  clearLabel,
  language,
  ariaLabel,
}: Props) {
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [panelPosition, setPanelPosition] = useState<PanelPosition>({ top: 0, left: 0, width: 0 });
  const [viewDate, setViewDate] = useState(() => isoToDate(value) ?? isoToDate(minDate) ?? new Date());

  const locale = toIntlLocale(language);
  const minDateValue = minDate || todayIsoLocal();
  const selectedDate = isoToDate(value);
  const displayValue = value ? formatDisplayDate(value, locale) : '';

  const weekdayLabels = useMemo(() => getWeekdayLabels(locale), [locale]);
  const monthOptions = useMemo(() => getMonthOptions(locale), [locale]);
  const yearOptions = useMemo(() => {
    const minYear = isoToDate(minDateValue)?.getFullYear() ?? new Date().getFullYear();
    return getYearOptions(minYear, minYear + 3);
  }, [minDateValue]);

  const monthDays = useMemo(
    () => buildMonthGrid(viewDate.getFullYear(), viewDate.getMonth()),
    [viewDate],
  );

  const updatePanelPosition = () => {
    if (!rootRef.current) return;
    const rect = rootRef.current.getBoundingClientRect();
    const horizontalPadding = 16;
    const width = Math.min(rect.width, window.innerWidth - horizontalPadding * 2);
    const left = Math.min(
      Math.max(horizontalPadding, rect.left),
      window.innerWidth - width - horizontalPadding,
    );
    setPanelPosition({
      top: rect.bottom + 12,
      left,
      width,
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePanelPosition();
    window.addEventListener('resize', updatePanelPosition);
    window.addEventListener('scroll', updatePanelPosition, true);
    return () => {
      window.removeEventListener('resize', updatePanelPosition);
      window.removeEventListener('scroll', updatePanelPosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      const panel = document.getElementById(panelId);
      if (panel?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open, panelId]);

  useEffect(() => {
    if (selectedDate) setViewDate(selectedDate);
  }, [value]);

  const shiftMonth = (delta: number) => {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  };

  const handleSelectDay = (day: Date) => {
    const iso = dateToIso(day);
    if (iso < minDateValue) return;
    onChange(iso);
    setOpen(false);
  };

  const handleToday = () => {
    const today = todayIsoLocal();
    if (today < minDateValue) return;
    onChange(today);
    setViewDate(isoToDate(today) ?? new Date());
    setOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setOpen(false);
  };

  const overlay =
    typeof document !== 'undefined'
      ? createPortal(
          <AnimatePresence>
            {open ? (
              <>
                <motion.button
                  type="button"
                  aria-label="Close calendar"
                  className="fixed inset-0 z-[120] bg-[#0F172A]/10 backdrop-blur-[3px]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  onClick={() => setOpen(false)}
                />
                <motion.div
                  id={panelId}
                  role="dialog"
                  aria-modal="true"
                  aria-label={ariaLabel}
                  className="fixed z-[130] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[28px] border border-[rgba(37,99,255,0.15)] bg-white p-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)] sm:p-5"
                  style={{
                    top: panelPosition.top,
                    left: panelPosition.left,
                    width: panelPosition.width,
                  }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => shiftMonth(-1)}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(37,99,255,0.06)] text-[#2563FF] transition-colors hover:bg-[rgba(37,99,255,0.12)]"
                      aria-label="Previous month"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>

                    <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
                      <select
                        value={viewDate.getMonth()}
                        onChange={(event) =>
                          setViewDate(new Date(viewDate.getFullYear(), Number(event.target.value), 1))
                        }
                        className="max-w-[9.5rem] truncate rounded-lg border border-transparent bg-[#F5F7FB] px-2 py-1.5 text-sm font-bold capitalize text-[#0F172A] outline-none focus:border-[rgba(37,99,255,0.25)]"
                        aria-label="Month"
                      >
                        {monthOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={viewDate.getFullYear()}
                        onChange={(event) =>
                          setViewDate(new Date(Number(event.target.value), viewDate.getMonth(), 1))
                        }
                        className="rounded-lg border border-transparent bg-[#F5F7FB] px-2 py-1.5 text-sm font-bold text-[#0F172A] outline-none focus:border-[rgba(37,99,255,0.25)]"
                        aria-label="Year"
                      >
                        {yearOptions.map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => shiftMonth(1)}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(37,99,255,0.06)] text-[#2563FF] transition-colors hover:bg-[rgba(37,99,255,0.12)]"
                      aria-label="Next month"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="mb-2 grid grid-cols-7 gap-1">
                    {weekdayLabels.map((label) => (
                      <div
                        key={label}
                        className="py-1 text-center text-[11px] font-medium uppercase tracking-wide text-[#64748B]"
                      >
                        {label.replace('.', '')}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1.5">
                    {monthDays.map((day) => {
                      const iso = dateToIso(day);
                      const inMonth = isSameMonth(day, viewDate);
                      const selected = selectedDate ? isSameDay(day, selectedDate) : false;
                      const isToday = isSameDay(day, new Date());
                      const disabled = iso < minDateValue;

                      return (
                        <button
                          key={`${iso}-${inMonth ? 'in' : 'out'}`}
                          type="button"
                          disabled={disabled}
                          onClick={() => handleSelectDay(day)}
                          className={`relative flex h-11 items-center justify-center rounded-2xl text-sm font-semibold transition-all touch-manipulation ${
                            selected
                              ? 'bg-gradient-to-b from-[#2563FF] to-[#3B82F6] text-white shadow-[0_10px_25px_rgba(37,99,255,0.35)]'
                              : disabled
                                ? 'cursor-not-allowed text-[#64748B] opacity-35'
                                : inMonth
                                  ? 'text-[#0F172A] hover:bg-[rgba(37,99,255,0.06)]'
                                  : 'text-[#64748B] opacity-35 hover:bg-[rgba(37,99,255,0.04)]'
                          }`}
                        >
                          {day.getDate()}
                          {selected ? (
                            <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-white" aria-hidden />
                          ) : null}
                          {!selected && isToday && inMonth ? (
                            <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-[#2563FF]" aria-hidden />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-[rgba(37,99,255,0.1)] pt-4">
                    <button
                      type="button"
                      onClick={handleToday}
                      className="text-sm font-bold text-[#2563FF] transition-opacity hover:opacity-80"
                    >
                      {todayLabel}
                    </button>
                    <span className="h-5 w-px bg-[rgba(37,99,255,0.15)]" aria-hidden />
                    <button
                      type="button"
                      onClick={handleClear}
                      className="text-sm font-bold text-[#EF4444] transition-opacity hover:opacity-80"
                    >
                      {clearLabel}
                    </button>
                  </div>
                </motion.div>
              </>
            ) : null}
          </AnimatePresence>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => {
          updatePanelPosition();
          setOpen((current) => !current);
        }}
        className={`${PREMIUM_FIELD_CLASS} ${
          open
            ? 'border-[#2563FF] shadow-[0_0_0_6px_rgba(37,99,255,0.12)]'
            : 'border-[rgba(37,99,255,0.15)] hover:border-[rgba(37,99,255,0.28)]'
        }`}
      >
        <Calendar className="h-5 w-5 shrink-0 text-[#2563FF]" aria-hidden />
        <span
          className={`min-w-0 flex-1 truncate text-base font-bold ${
            displayValue ? 'text-[#0F172A]' : 'text-[#64748B]'
          }`}
        >
          {displayValue || placeholder}
        </span>
        <Calendar className="h-5 w-5 shrink-0 text-[#2563FF]/70" aria-hidden />
      </button>
      {overlay}
    </div>
  );
}
