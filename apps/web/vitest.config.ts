import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [{ find: /^@\//, replacement: fileURLToPath(new URL('./src/', import.meta.url)) }],
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    // Keep DOM-heavy journey tests from exhausting laptop resources. Some tests
    // traverse several lazy routes and need more than the default five seconds.
    maxWorkers: 1,
    testTimeout: 15000,
    // Unit tests inject Auth clients; never contact the hosted project from .env.
    env: {
      VITE_SUPABASE_URL: '',
      VITE_SUPABASE_PUBLISHABLE_KEY: '',
      VITE_API_URL: 'http://localhost:3001',
    },
  },
});
