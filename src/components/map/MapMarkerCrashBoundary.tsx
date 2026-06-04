import React from 'react';

type Props = {
  children: React.ReactNode;
  fallback: React.ReactNode;
  onCrash?: (error: unknown) => void;
};

type State = { crashed: boolean };

/** Catches marker render errors so the map route never hits AppErrorBoundary. */
export class MapMarkerCrashBoundary extends React.Component<Props, State> {
  state: State = { crashed: false };

  static getDerivedStateFromError(): State {
    return { crashed: true };
  }

  componentDidCatch(error: unknown) {
    console.error('[LinkHelp] Map marker render failed', error);
    this.props.onCrash?.(error);
  }

  render() {
    if (this.state.crashed) return this.props.fallback;
    return this.props.children;
  }
}
