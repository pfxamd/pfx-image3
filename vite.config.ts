import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'site-dist',
    emptyOutDir: true,
  },
  optimizeDeps: {
    exclude: [
      '@jsquash/jpeg',
      '@jsquash/png',
      '@jsquash/oxipng',
      '@jsquash/webp',
    ],
  },
});
