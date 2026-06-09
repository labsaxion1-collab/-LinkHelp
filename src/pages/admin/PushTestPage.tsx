import { useState } from 'react';
import { Bell, BellOff, CheckCircle2, XCircle, AlertTriangle, Send, RefreshCw } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuth } from '@/context/AuthContext';
import { isWebPushConfigured, VAPID_PUBLIC_KEY } from '@/config/pushNotifications';
import { isPushSupported } from '@/services/push/pushNotificationClient';
import { getSupabase } from '@/lib/supabase';

type TestStatus = 'idle' | 'sending' | 'ok' | 'error';

function StatusRow({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3">
      {ok ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
      ) : (
        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
      )}
      <div className="min-w-0">
        <p className="text-sm font-medium text-white">{label}</p>
        {detail && <p className="mt-0.5 break-all text-xs text-slate-400">{detail}</p>}
      </div>
    </div>
  );
}

export default function PushTestPage() {
  const { session } = useAuth();
  const { supported, configured, permission, subscribing, enablePush } = usePushNotifications();
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testError, setTestError] = useState('');
  const [testResult, setTestResult] = useState<Record<string, unknown> | null>(null);

  const userId = session?.user?.id ?? '';
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;

  async function sendTestPush() {
    setTestStatus('sending');
    setTestError('');
    setTestResult(null);

    try {
      const sb = getSupabase();
      if (!sb) throw new Error('Supabase client not initialized');

      const { data, error } = await sb.functions.invoke('send-push', {
        body: {
          userId,
          title: 'LinkHelp Push — Teste',
          body: 'Se você está vendo isso, as push notifications estão funcionando!',
          url: '/notifications',
        },
      });

      if (error) throw error;
      setTestResult(data as Record<string, unknown>);
      setTestStatus('ok');
    } catch (e) {
      setTestError(e instanceof Error ? e.message : String(e));
      setTestStatus('error');
    }
  }

  const allGreen = supported && configured && permission === 'granted';

  return (
    <div className="mx-auto max-w-xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-bold text-white">Push Notifications — Diagnóstico</h1>
        <p className="mt-1 text-sm text-slate-400">
          Rota de teste: <code className="rounded bg-white/10 px-1 py-0.5 text-xs">/admin/push-test</code>
        </p>
      </div>

      {/* Status checks */}
      <section className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Configuração</p>
        <StatusRow
          label="Browser suporta Web Push"
          ok={supported}
          detail={!supported ? 'Use Chrome, Edge ou Firefox no desktop/Android' : undefined}
        />
        <StatusRow
          label="VITE_VAPID_PUBLIC_KEY configurada"
          ok={configured}
          detail={
            configured
              ? VAPID_PUBLIC_KEY.slice(0, 20) + '…'
              : 'Adicione VITE_VAPID_PUBLIC_KEY no .env.local'
          }
        />
        <StatusRow
          label="Permissão de notificação"
          ok={permission === 'granted'}
          detail={
            permission === 'loading'
              ? 'Carregando…'
              : permission === 'granted'
                ? 'Concedida'
                : permission === 'denied'
                  ? 'Negada — redefina nas configurações do browser'
                  : permission === 'unsupported'
                    ? 'Não suportado neste browser'
                    : 'Pendente (clique em Ativar Push abaixo)'
          }
        />
        <StatusRow
          label="Usuário autenticado"
          ok={!!userId}
          detail={userId ? `ID: ${userId.slice(0, 8)}…` : 'Faça login primeiro'}
        />
        <StatusRow
          label="Supabase URL configurada"
          ok={!!supabaseUrl}
          detail={supabaseUrl ?? 'VITE_SUPABASE_URL ausente'}
        />
      </section>

      {/* Enable push button */}
      {!allGreen && supported && configured && permission !== 'denied' && (
        <button
          onClick={() => void enablePush()}
          disabled={subscribing}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {subscribing ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Bell className="h-4 w-4" />
          )}
          {subscribing ? 'Ativando…' : 'Ativar Push e Salvar Subscription'}
        </button>
      )}

      {permission === 'denied' && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <BellOff className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <p className="text-sm text-amber-300">
            Permissão bloqueada. Vá em <strong>Configurações do browser → Notificações</strong> e
            permita para este site, depois recarregue.
          </p>
        </div>
      )}

      {/* Test send */}
      {allGreen && (
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Enviar Push de Teste
          </p>
          <button
            onClick={() => void sendTestPush()}
            disabled={testStatus === 'sending'}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            {testStatus === 'sending' ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {testStatus === 'sending' ? 'Enviando…' : 'Enviar Push para mim mesmo'}
          </button>

          {testStatus === 'ok' && testResult && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
                Push enviado com sucesso
              </p>
              <pre className="overflow-x-auto text-xs text-emerald-200">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </div>
          )}

          {testStatus === 'error' && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
              <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-red-300">
                <AlertTriangle className="h-4 w-4" />
                Erro ao enviar
              </p>
              <p className="text-xs text-red-200">{testError}</p>
            </div>
          )}
        </section>
      )}

      {/* Checklist manual */}
      <section className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Checklist de configuração completa
        </p>
        <ul className="space-y-1 text-xs text-slate-300">
          <li>1. VITE_VAPID_PUBLIC_KEY no .env.local e Vercel</li>
          <li>2. VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY + VAPID_SUBJECT nos secrets da edge function (Supabase Dashboard)</li>
          <li>3. Migration 0040 aplicada (supabase db push ou SQL Editor)</li>
          <li>4. app.settings configurados via scripts/configure-db-settings.sql</li>
          <li>5. supabase functions deploy send-push</li>
        </ul>
      </section>
    </div>
  );
}
