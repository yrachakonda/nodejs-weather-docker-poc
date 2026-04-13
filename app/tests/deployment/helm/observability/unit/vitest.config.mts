import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/deployment/helm/observability/unit/**/*.test.ts'],
    environment: 'node',
    globals: true,
    testTimeout: 120000
  }
});
