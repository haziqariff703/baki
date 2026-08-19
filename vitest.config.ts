import path from 'node:path';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => {
  // Load .env so integration tests can reach the Supabase project.
  const env = loadEnv(mode, __dirname, '');
  return {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    test: {
      include: ['tests/**/*.test.{ts,tsx}'],
      env,
    },
  };
});
