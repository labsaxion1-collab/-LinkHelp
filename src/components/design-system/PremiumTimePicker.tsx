import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, Clock } from 'lucide-react';

const VISIBLE_HOUR_COUNT = 4;
const HOUR_ROW_HEIGHT_PX = 56;

const PREMIUM_FIELD_CLASS =
  'flex min-h-[72px] w-full items-center gap-3 rounded-[24px] border bg-white px-4 text-left transition-all touch-manipulation';

type PanelPosition = {
  top: number;
  left: number;
  width: number;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder: string;
  clearLabel: string;
  ariaLabel: string;
};

export function PremiumTimePicker({
  value,
  onChange,
  options,
  placeholder,
  clearLabel,
  ariaLabel,
}: Props) {
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [panelPosition, setPanelPosition] = useState<PanelPosition>({ top: 0, left: 0, width: 0 });

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
    if (!open || !listRef.current) return;
    const selectedIndex = options.indexOf(value);
    const scrollTop =
      selectedIndex >= 0
        ? Math.max(0, selectedIndex * HOUR_ROW_HEIGHT_PX - HOUR_ROW_HEIGHT_PX)
        : 0;
    listRef.current.scrollTop = scrollTop;
  }, [open, value, options]);

  const overlay =
    typeof document !== 'undefined'
      ? createPortal(
          <AnimatePresence>
            {open ? (
              <>
                <motion.button
                  type="button"
                  aria-label="Close time picker"
                  className="fixed inset-0 z-[120] bg-[#0F172A]/10 backdrop-blur-[3px]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  onClick={() => setOpen(false)}
                />
                <motion.div
                  id={panelId}
                  role="listbox"
                  aria-label={ariaLabel}
                  className="fixed z-[130] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[28px] border border-[rgba(37,99,255,0.15)] bg-white shadow-[0_20px_60px_rgba(15,23,42,0.12)]"
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
                  <div
                    ref={listRef}
                    className="overflow-y-auto scroll-smooth [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[rgba(37,99,255,0.25)]"
                    style={{ height: `${VISIBLE_HOUR_COUNT * HOUR_ROW_HEIGHT_PX}px` }}
                  >
                    {options.map((hour) => {
                      const selected = value === hour;
                      return (
                        <button
                          key={hour}
                          type="button"
                          role="option"
                          aria-selected={selected}
                          onClick={() => {
                            onChange(hour);
                            setOpen(false);
                          }}
                          className={`flex min-h-[56px] w-full items-center justify-center text-base font-bold tabular-nums transition-all touch-manipulation ${
                            selected
                              ? 'bg-gradient-to-b from-[#2563FF] to-[#3B82F6] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]'
                              : 'text-[#0F172A] hover:bg-[rgba(37,99,255,0.06)]'
                          }`}
                        >
                          {hour}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-center border-t border-[rgba(37,99,255,0.1)] px-4 py-3">
                    <button
                      type="button"
                      onClick={() => {
                        onChange('');
                        setOpen(false);
                      }}
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
        aria-haspopup="listbox"
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
        <Clock className="h-5 w-5 shrink-0 text-[#2563FF]" aria-hidden />
        <span
          className={`min-w-0 flex-1 truncate text-base font-bold tabular-nums ${
            value ? 'text-[#0F172A]' : 'text-[#64748B]'
          }`}
        >
          {value || placeholder}
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-[#2563FF]/70 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>
      {overlay}
    </div>
  );
}
