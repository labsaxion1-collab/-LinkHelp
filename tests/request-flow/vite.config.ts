import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
const root = path.resolve(__dirname, '../..');
const mocks = path.resolve(__dirname, 'mocks.tsx');
const modules = ['context/LanguageContext', 'context/AppDataContext', 'context/ToastContext', 'hooks/useSessionViewer', 'lib/supabase', 'context/AppModeContext', 'components/layout/CloseToHomeButton', 'components/client/create-request/RequestAddressInput'];
export default defineConfig({
  root: __dirname, envDir: __dirname, envPrefix: 'TEST_ONLY_',
  plugins: [react(), tailwindcss()],
  resolve: { alias: [...modules.map(name => ({ find: '@/' + name, replacement: mocks })), { find: '@', replacement: path.join(root, 'src') }] },
  define: { 'import.meta.env.VITE_LINKHELP_BASELINE_FINANCE': JSON.stringify('true') },
  server: { host: '127.0.0.1', port: 3107, strictPort: true, fs: { allow: [root] } },
});
