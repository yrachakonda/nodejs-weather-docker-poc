import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      ioredis: path.resolve(__dirname, 'node_modules/ioredis/built/index.js')
    }
  },
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
