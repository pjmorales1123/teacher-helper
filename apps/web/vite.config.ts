import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const api = `http://127.0.0.1:${process.env.PORT ?? 3000}`;

export default defineConfig({
  plugins: [react()],
  // The BetterOffice engines ship WASM and workers; pre-bundling breaks their asset URLs.
  optimizeDeps: { exclude: ['@betteroffice/docx', '@betteroffice/xlsx', '@betteroffice/pptx', '@betteroffice/fonts'] },
  worker: { format: 'es' },
  build: { target: 'es2022', chunkSizeWarningLimit: 8000 },
  server: { port: 5173, proxy: { '/api': { target: api, changeOrigin: false } } },
});
