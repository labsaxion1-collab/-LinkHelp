/** Lightweight route transition loader — avoids blank main area during auth/chunk suspense. */
export function PageLoader() {
  return (
    <div
      className="flex min-h-[40vh] w-full flex-1 items-center justify-center px-4"
      aria-busy="true"
      aria-label="Loading"
    >
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-[#2563FF]/20 border-t-[#2563FF]"
        role="status"
      />
    </div>
  );
}
