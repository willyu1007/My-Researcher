import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@renderer': path.resolve(__dirname, './src/renderer'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    fs: {
      allow: [repoRoot],
    },
  },
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
  },
});
