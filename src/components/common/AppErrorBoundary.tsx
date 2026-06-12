import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { isChunkLoadError } from '@/utils/lazyWithRetry';

type Props = {
  children: React.ReactNode;
  resetKey?: string;
  title?: string;
  body?: string;
  reloadLabel?: string;
};

type State = {
  hasError: boolean;
  errorDetail?: string;
};

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: unknown): State {
    const errorDetail =
      error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    return { hasError: true, errorDetail };
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false, errorDetail: undefined });
    }
  }

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo) {
    const errorName = error instanceof Error ? error.name : 'UnknownError';
    const errorMessage = error instanceof Error ? error.message : String(error);
    const chunkLoadFailure = isChunkLoadError(error);

    console.error('[LinkHelp][RouteError]', {
      pathname: typeof window !== 'undefined' ? window.location.pathname : '',
      resetKey: this.props.resetKey,
      errorName,
      errorMessage,
      chunkLoadFailure,
      componentStack: errorInfo.componentStack,
    });

    if (chunkLoadFailure && typeof window !== 'undefined') {
      const reloadKey = 'lh:chunk-reload';
      if (!sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, '1');
        window.location.reload();
      }
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-[55vh] w-full items-center justify-center px-4 py-10 text-center">
        <div className="w-full max-w-sm rounded-3xl border border-sky-100 bg-white/75 p-6 text-[#0D1B2A] shadow-xl shadow-sky-100/70 backdrop-blur-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-[#1565FF]">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-xl font-black">{this.props.title ?? 'Ops, esta tela nao carregou.'}</h2>
          <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
            {this.props.body ?? 'Tente abrir novamente. Se continuar, volte para o inicio e tente outra acao.'}
          </p>
          {this.state.errorDetail ? (
            <p className="mt-3 break-all rounded-lg bg-rose-50 px-3 py-2 text-left text-xs font-mono text-rose-800">
              {this.state.errorDetail}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-[#1565FF] px-5 text-sm font-bold text-white shadow-lg shadow-blue-500/20"
          >
            <RefreshCw className="h-4 w-4" />
            {this.props.reloadLabel ?? 'Recarregar tela'}
          </button>
        </div>
      </div>
    );
  }
}
