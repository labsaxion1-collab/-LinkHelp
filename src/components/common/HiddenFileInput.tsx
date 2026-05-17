import React, { useId } from 'react';

function handleInputChange(
  e: React.ChangeEvent<HTMLInputElement>,
  onFiles: (files: FileList | null) => void,
) {
  console.log('[media-picker] INPUT CHANGE');
  const file = e.target.files?.[0] ?? null;
  console.log('[media-picker] FILE:', file);
  onFiles(e.target.files);
  const input = e.target;
  window.setTimeout(() => {
    input.value = '';
  }, 0);
}

type FilePickerLabelProps = {
  accept: string;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
  onFiles: (files: FileList | null) => void;
};

/**
 * Clickable region with a real file input overlay (opacity 0, full size).
 * Reliable on Windows desktop — avoids sr-only + detached label issues.
 */
export function FilePickerLabel({ accept, disabled, className = '', children, onFiles }: FilePickerLabelProps) {
  return (
    <label
      aria-disabled={disabled || undefined}
      className={`relative block${disabled ? ' pointer-events-none opacity-50 cursor-not-allowed' : ' cursor-pointer'} ${className}`}
    >
      {children}
      <input
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={(e) => handleInputChange(e, onFiles)}
        className="absolute inset-0 z-[60] h-full w-full cursor-pointer opacity-0"
        tabIndex={-1}
        aria-label="Choose file"
      />
    </label>
  );
}

type FilePickerZoneProps = {
  accept: string;
  disabled?: boolean;
  onFiles: (files: FileList | null) => void;
  className?: string;
  children: React.ReactNode;
};

/** Drop/click zone — file input covers the full zone on top. */
export function FilePickerZone({ accept, disabled, onFiles, className = '', children }: FilePickerZoneProps) {
  const inputId = useId();
  return (
    <div className={`relative ${className}`}>
      <div className="relative z-10 pointer-events-none">{children}</div>
      {!disabled ? (
        <input
          id={inputId}
          type="file"
          accept={accept}
          disabled={disabled}
          onChange={(e) => handleInputChange(e, onFiles)}
          className="absolute inset-0 z-[60] h-full w-full cursor-pointer opacity-0 rounded-[inherit]"
          aria-label="Choose file"
        />
      ) : null}
    </div>
  );
}

/** @deprecated Use FilePickerLabel */
export function NativeFileInput({
  inputId,
  accept,
  disabled,
  onFiles,
}: {
  inputId: string;
  accept: string;
  disabled?: boolean;
  onFiles: (files: FileList | null) => void;
}) {
  return (
    <input
      id={inputId}
      type="file"
      accept={accept}
      disabled={disabled}
      onChange={(e) => handleInputChange(e, onFiles)}
      className="absolute inset-0 z-[60] h-full w-full cursor-pointer opacity-0"
      tabIndex={-1}
    />
  );
}

/** @deprecated Use FilePickerLabel or FilePickerZone */
export const HiddenFileInput = React.forwardRef<
  HTMLInputElement,
  {
    accept: string;
    disabled?: boolean;
    onFiles: (files: FileList | null) => void;
    className?: string;
  }
>(function HiddenFileInput({ accept, disabled, onFiles }, _ref) {
  const inputId = useId();
  return (
    <NativeFileInput inputId={inputId} accept={accept} disabled={disabled} onFiles={onFiles} />
  );
});

/** @deprecated */
export function useFileInputOpener(_inputRef: React.RefObject<HTMLInputElement | null>, _disabled?: boolean) {
  return () => {};
}
