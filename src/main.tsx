import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { shouldRegisterServiceWorker } from '@/utils/linkhelpHosts';
import { clearChunkReloadFlag } from '@/utils/lazyWithRetry';

function installGlobalErrorLogging() {
  if (typeof window === 'undefined') return;

  window.addEventListener('unhandledrejection', (event) => {
    console.error('[LinkHelp][unhandledrejection]', {
      pathname: window.location.pathname,
      reason: event.reason instanceof Error ? event.reason.message : String(event.reason),
    });
  });

  window.addEventListener('error', (event) => {
    console.error('[LinkHelp][window.error]', {
      pathname: window.location.pathname,
      message: event.error instanceof Error ? event.error.message : event.message,
    });
  });
}

if (import.meta.env.DEV) {
  installGlobalErrorLogging();
}

if (import.meta.env.PROD && shouldRegisterServiceWorker()) {
  clearChunkReloadFlag();
  void import('virtual:pwa-register').then(({ registerSW }) => {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        void updateSW(true);
      },
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
