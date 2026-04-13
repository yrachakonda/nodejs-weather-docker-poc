import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/deployment/helm/observability/integration/**/*.test.ts'],
    environment: 'node',
    globals: true,
    testTimeout: 900000
  }
});
