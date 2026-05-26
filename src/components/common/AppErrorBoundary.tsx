import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

type Props = {
  children: React.ReactNode;
  resetKey?: string;
};

type State = {
  hasError: boolean;
};

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  componentDidCatch(error: unknown) {
    console.error('[LinkHelp] Route render failed', error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-[55vh] w-full items-center justify-center px-4 py-10 text-center">
        <div className="w-full max-w-sm rounded-3xl border border-sky-100 bg-white/75 p-6 text-[#0D1B2A] shadow-xl shadow-sky-100/70 backdrop-blur-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-[#1565FF]">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-xl font-black">Ops, esta tela nao carregou.</h2>
          <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
            Tente abrir novamente. Se continuar, volte para o inicio e tente outra acao.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-[#1565FF] px-5 text-sm font-bold text-white shadow-lg shadow-blue-500/20"
          >
            <RefreshCw className="h-4 w-4" />
            Recarregar tela
          </button>
        </div>
      </div>
    );
  }
}
