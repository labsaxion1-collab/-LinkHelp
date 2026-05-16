import React, { useRef, useCallback } from 'react';

type HiddenFileInputProps = {
  accept: string;
  disabled?: boolean;
  onFiles: (files: FileList | null) => void;
  className?: string;
};

/** Visually hidden file input; use `open()` from a button/zone — reliable on mobile (no label+disabled quirks). */
export const HiddenFileInput = React.forwardRef<HTMLInputElement, HiddenFileInputProps>(function HiddenFileInput(
  { accept, disabled, onFiles, className },
  forwardedRef,
) {
  const innerRef = useRef<HTMLInputElement>(null);
  const setRef = useCallback(
    (el: HTMLInputElement | null) => {
      (innerRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
      if (typeof forwardedRef === 'function') forwardedRef(el);
      else if (forwardedRef) forwardedRef.current = el;
    },
    [forwardedRef],
  );

  return (
    <input
      ref={setRef}
      type="file"
      accept={accept}
      disabled={disabled}
      className={className ?? 'fixed left-[-9999px] top-0 h-px w-px opacity-0 overflow-hidden'}
      tabIndex={-1}
      aria-hidden
      onChange={(e) => {
        onFiles(e.target.files);
        e.target.value = '';
      }}
    />
  );
});

export function useFileInputOpener(inputRef: React.RefObject<HTMLInputElement | null>, disabled?: boolean) {
  return useCallback(() => {
    if (disabled) return;
    inputRef.current?.click();
  }, [disabled, inputRef]);
}
