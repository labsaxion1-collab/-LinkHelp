import { useState, type FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import { BackofficeApiError, backofficeFetch } from '@/backoffice/api/backofficeClient';
import { BACKOFFICE_PT, formatBackofficeApiError } from '@/admin/fluxPtCopy';
import { useToast } from '@/context/ToastContext';

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
};

export function InviteAdministratorModal({ open, onClose, onCreated }: Props) {
  const { session } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState<'super_admin' | 'operations_admin'>('operations_admin');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const token = session?.access_token;
    if (!token) return;
    setSubmitting(true);
    setError(null);
    try {
      await backofficeFetch(token, '/api/admin/administrators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'invite', email, roleId }),
      });
      showToast(BACKOFFICE_PT.inviteSuccess, 'success');
      setEmail('');
      setRoleId('operations_admin');
      onCreated();
    } catch (err: unknown) {
      setError(
        formatBackofficeApiError(err instanceof BackofficeApiError ? err.code : 'INVITE_CREATE_FAILED'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl border border-cyan-500/20 bg-[#0a0f1a] p-5 shadow-2xl">
        <h3 className="text-lg font-black text-white">{BACKOFFICE_PT.addAdministrator}</h3>
        <p className="mt-1 text-sm text-slate-400">{BACKOFFICE_PT.administratorsSubtitle}</p>

        <form className="mt-4 space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          <label className="block space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              {BACKOFFICE_PT.inviteEmailLabel}
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white"
              placeholder="nome@empresa.com"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              {BACKOFFICE_PT.inviteRoleLabel}
            </span>
            <select
              value={roleId}
              onChange={(e) => setRoleId(e.target.value as 'super_admin' | 'operations_admin')}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white"
            >
              <option value="operations_admin">{BACKOFFICE_PT.roleOperationsAdmin}</option>
              <option value="super_admin">{BACKOFFICE_PT.roleSuperAdmin}</option>
            </select>
          </label>

          {error ? <p className="text-sm text-rose-300">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/5"
            >
              {BACKOFFICE_PT.inviteCancel}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-cyan-500/20 px-3 py-2 text-xs font-bold text-cyan-100 hover:bg-cyan-500/30 disabled:opacity-50"
            >
              {BACKOFFICE_PT.inviteSubmit}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
