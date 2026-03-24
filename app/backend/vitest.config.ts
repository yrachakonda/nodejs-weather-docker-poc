import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    setupFiles: ['../tests/backend/setup.ts'],
    include: ['../tests/backend/**/*.test.ts'],
    coverage: {
      enabled: false
    }
  }
});
