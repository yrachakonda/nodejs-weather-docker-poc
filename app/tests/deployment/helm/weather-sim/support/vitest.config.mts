import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: path.resolve(currentDir, '../../../../../'),
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/deployment/helm/weather-sim/unit/**/*.test.ts'],
    clearMocks: true
  }
});
