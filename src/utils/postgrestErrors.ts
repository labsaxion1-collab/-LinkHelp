/** PostgREST / Supabase client errors when a table, column, or RPC is missing from the API schema. */
export function isPostgrestMissingResource(
  error: { code?: string; message?: string; status?: number; details?: string } | null | undefined,
): boolean {
  if (!error) return false;
  const code = error.code ?? '';
  const msg = (error.message ?? '').toLowerCase();
  const details = (error.details ?? '').toLowerCase();
  return (
    code === 'PGRST202' ||
    code === 'PGRST205' ||
    code === '42P01' ||
    error.status === 404 ||
    msg.includes('could not find the function') ||
    msg.includes('could not find') ||
    msg.includes('schema cache') ||
    msg.includes('relation') && msg.includes('does not exist') ||
    details.includes('does not exist')
  );
}
