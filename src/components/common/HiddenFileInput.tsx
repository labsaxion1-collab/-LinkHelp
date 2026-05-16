import React, { useId } from 'react';

function logFileSelected(file: File | undefined) {
  if (import.meta.env.DEV) {
    console.log('FILE SELECTED:', file);
  }
}

type NativeFileInputProps = {
  inputId: string;
  accept: string;
  disabled?: boolean;
  onFiles: (files: FileList | null) => void;
};

/** Visually hidden but present in the DOM — associate with `FilePickerLabel` or `FilePickerZone`. */
export function NativeFileInput({ inputId, accept, disabled, onFiles }: NativeFileInputProps) {
  return (
    <input
      id={inputId}
      type="file"
      accept={accept}
      disabled={disabled}
      className="sr-only"
      tabIndex={-1}
      onChange={(e) => {
        const files = e.target.files;
        logFileSelected(files?.[0]);
        onFiles(files);
        const input = e.target;
        window.setTimeout(() => {
          input.value = '';
        }, 0);
      }}
    />
  );
}

type FilePickerLabelProps = {
  inputId: string;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
};

/** Click target wired to a file input via native label — works on iOS/Android without programmatic .click(). */
export function FilePickerLabel({ inputId, disabled, className = '', children }: FilePickerLabelProps) {
  return (
    <label
      htmlFor={disabled ? undefined : inputId}
      aria-disabled={disabled || undefined}
      className={`${className}${disabled ? ' pointer-events-none opacity-50 cursor-not-allowed' : ' cursor-pointer'}`}
    >
      {children}
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

/** Drop/click zone with a full-size transparent label overlay — reliable inside modals on mobile. */
export function FilePickerZone({ accept, disabled, onFiles, className = '', children }: FilePickerZoneProps) {
  const inputId = useId();
  return (
    <div className={`relative ${className}`}>
      <NativeFileInput inputId={inputId} accept={accept} disabled={disabled} onFiles={onFiles} />
      <div className="relative z-10 pointer-events-none">{children}</div>
      {!disabled ? (
        <label
          htmlFor={inputId}
          className="absolute inset-0 z-20 cursor-pointer rounded-[inherit]"
          aria-label="Choose file"
        />
      ) : null}
    </div>
  );
}

/** @deprecated Use NativeFileInput + FilePickerLabel or FilePickerZone */
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
  return <NativeFileInput inputId={inputId} accept={accept} disabled={disabled} onFiles={onFiles} />;
});

/** @deprecated Use FilePickerLabel or FilePickerZone */
export function useFileInputOpener(_inputRef: React.RefObject<HTMLInputElement | null>, _disabled?: boolean) {
  return () => {};
}
