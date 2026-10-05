import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['browser-tests/**', 'node_modules/**', 'dist/**'],
  },
});
