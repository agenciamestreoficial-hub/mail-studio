import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createCountdownMiddleware } from './server/countdown-route.ts';

export default defineConfig({
  plugins: [react(), { name: 'mail-studio-countdown', configureServer(server) { server.middlewares.use(createCountdownMiddleware()); }, configurePreviewServer(server) { server.middlewares.use(createCountdownMiddleware()); } }],
  server: { host: '0.0.0.0', port: 5173, allowedHosts: ['terminal.local', '.replit.dev', '.replit.app', '.repl.co'] },
  build: { chunkSizeWarningLimit: 1800 },
});
