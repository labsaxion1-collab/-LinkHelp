import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { BackofficeApiError, backofficeFetch } from '@/backoffice/api/backofficeClient';
import { BackofficePageShell, BackofficeTableShell } from '@/backoffice/components/BackofficePageShell';
import { BACKOFFICE_PT, formatBackofficeApiError } from '@/admin/fluxPtCopy';
import { InviteAdministratorModal } from '@/pages/admin/administrators/InviteAdministratorModal';

type AdminRow = {
  userId: string;
  email: string | null;
  name: string | null;
  roleId: string;
  status: string;
  grantedAt: string | null;
};

type InviteRow = {
  id: string;
  email: string;
  roleId: string;
  status: string;
  createdAt: string;
  expiresAt: string;
};

type ListResponse = {
  administrators: AdminRow[];
  pendingInvites: InviteRow[];
};

function roleLabel(roleId: string): string {
  if (roleId === 'super_admin') return BACKOFFICE_PT.roleSuperAdmin;
  if (roleId === 'operations_admin') return BACKOFFICE_PT.roleOperationsAdmin;
  return roleId;
}

function statusLabel(status: string): string {
  if (status === 'active') return BACKOFFICE_PT.statusActive;
  if (status === 'inactive') return BACKOFFICE_PT.statusInactive;
  if (status === 'revoked') return BACKOFFICE_PT.statusRevoked;
  if (status === 'pending') return BACKOFFICE_PT.statusPending;
  return status;
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'America/Toronto',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function AdministratorsPage() {
  const { session } = useAuth();
  const [data, setData] = useState<ListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = session?.access_token;
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const payload = await backofficeFetch<ListResponse>(token, '/api/admin/administrators');
      setData(payload);
    } catch (e: unknown) {
      setError(
        formatBackofficeApiError(e instanceof BackofficeApiError ? e.code : 'ADMIN_ADMINISTRATORS_UNAVAILABLE'),
      );
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    void load();
  }, [load]);

  const patchAdmin = async (userId: string, patch: { roleId?: string; status?: string }) => {
    const token = session?.access_token;
    if (!token) return;
    setBusyId(userId);
    setError(null);
    try {
      await backofficeFetch(token, '/api/admin/administrators', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...patch }),
      });
      await load();
    } catch (e: unknown) {
      setError(
        formatBackofficeApiError(e instanceof BackofficeApiError ? e.code : 'ADMIN_ADMINISTRATORS_UNAVAILABLE'),
      );
    } finally {
      setBusyId(null);
    }
  };

  const revokeInvite = async (inviteId: string) => {
    if (!window.confirm(BACKOFFICE_PT.confirmRevokeInvite)) return;
    const token = session?.access_token;
    if (!token) return;
    setBusyId(inviteId);
    setError(null);
    try {
      await backofficeFetch(token, '/api/admin/administrators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revoke_invite', inviteId }),
      });
      await load();
    } catch (e: unknown) {
      setError(
        formatBackofficeApiError(e instanceof BackofficeApiError ? e.code : 'ADMIN_ADMINISTRATORS_UNAVAILABLE'),
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <BackofficePageShell title={BACKOFFICE_PT.administratorsTitle} subtitle={BACKOFFICE_PT.administratorsSubtitle}>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="rounded-lg bg-cyan-500/20 px-3 py-2 text-xs font-bold text-cyan-100 hover:bg-cyan-500/30"
        >
          {BACKOFFICE_PT.addAdministrator}
        </button>
      </div>

      {loading ? <p className="text-sm text-slate-400">{BACKOFFICE_PT.loading}</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <section className="space-y-3">
        <h3 className="text-sm font-bold text-white">{BACKOFFICE_PT.adminsSection}</h3>
        <BackofficeTableShell empty={!loading && (data?.administrators.length ?? 0) === 0}>
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">{BACKOFFICE_PT.colName}</th>
                <th className="px-4 py-3">{BACKOFFICE_PT.colEmail}</th>
                <th className="px-4 py-3">{BACKOFFICE_PT.colRole}</th>
                <th className="px-4 py-3">{BACKOFFICE_PT.colStatus}</th>
                <th className="px-4 py-3">{BACKOFFICE_PT.colGrantedAt}</th>
                <th className="px-4 py-3">{BACKOFFICE_PT.actions}</th>
              </tr>
            </thead>
            <tbody>
              {(data?.administrators ?? []).map((row) => (
                <tr key={`${row.userId}-${row.roleId}`} className="border-b border-white/5 hover:bg-white/[0.03]">
                  <td className="px-4 py-3 text-white">{row.name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-300">{row.email ?? '—'}</td>
                  <td className="px-4 py-3">
                    <select
                      className="rounded-md border border-white/10 bg-black/40 px-2 py-1 text-xs text-white"
                      value={row.roleId}
                      disabled={busyId === row.userId}
                      onChange={(e) => void patchAdmin(row.userId, { roleId: e.target.value })}
                    >
                      <option value="super_admin">{BACKOFFICE_PT.roleSuperAdmin}</option>
                      <option value="operations_admin">{BACKOFFICE_PT.roleOperationsAdmin}</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{statusLabel(row.status)}</td>
                  <td className="px-4 py-3 text-slate-400">{formatDate(row.grantedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {row.status === 'active' ? (
                        <button
                          type="button"
                          disabled={busyId === row.userId}
                          className="text-xs font-semibold text-amber-300 hover:underline disabled:opacity-50"
                          onClick={() => {
                            if (window.confirm(BACKOFFICE_PT.confirmDeactivate)) {
                              void patchAdmin(row.userId, { status: 'inactive' });
                            }
                          }}
                        >
                          {BACKOFFICE_PT.deactivate}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busyId === row.userId}
                          className="text-xs font-semibold text-cyan-300 hover:underline disabled:opacity-50"
                          onClick={() => void patchAdmin(row.userId, { status: 'active' })}
                        >
                          {BACKOFFICE_PT.activate}
                        </button>
                      )}
                      {row.status !== 'revoked' ? (
                        <button
                          type="button"
                          disabled={busyId === row.userId}
                          className="text-xs font-semibold text-rose-300 hover:underline disabled:opacity-50"
                          onClick={() => {
                            if (window.confirm(BACKOFFICE_PT.confirmRevoke)) {
                              void patchAdmin(row.userId, { status: 'revoked' });
                            }
                          }}
                        >
                          {BACKOFFICE_PT.revokeAccess}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </BackofficeTableShell>
        {!loading && (data?.administrators.length ?? 0) === 0 ? (
          <p className="text-sm text-slate-500">{BACKOFFICE_PT.noAdministrators}</p>
        ) : null}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-bold text-white">{BACKOFFICE_PT.invitePendingSection}</h3>
        <BackofficeTableShell empty={!loading && (data?.pendingInvites.length ?? 0) === 0}>
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">{BACKOFFICE_PT.colEmail}</th>
                <th className="px-4 py-3">{BACKOFFICE_PT.colRole}</th>
                <th className="px-4 py-3">{BACKOFFICE_PT.colExpiresAt}</th>
                <th className="px-4 py-3">{BACKOFFICE_PT.actions}</th>
              </tr>
            </thead>
            <tbody>
              {(data?.pendingInvites ?? []).map((inv) => (
                <tr key={inv.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                  <td className="px-4 py-3 text-slate-200">{inv.email}</td>
                  <td className="px-4 py-3 text-slate-300">{roleLabel(inv.roleId)}</td>
                  <td className="px-4 py-3 text-slate-400">{formatDate(inv.expiresAt)}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={busyId === inv.id}
                      className="text-xs font-semibold text-rose-300 hover:underline disabled:opacity-50"
                      onClick={() => void revokeInvite(inv.id)}
                    >
                      {BACKOFFICE_PT.revokeInvite}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </BackofficeTableShell>
        {!loading && (data?.pendingInvites.length ?? 0) === 0 ? (
          <p className="text-sm text-slate-500">{BACKOFFICE_PT.noPendingInvites}</p>
        ) : null}
      </section>

      <InviteAdministratorModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => {
          setModalOpen(false);
          void load();
        }}
      />
    </BackofficePageShell>
  );
}
