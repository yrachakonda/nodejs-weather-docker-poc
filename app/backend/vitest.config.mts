import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      ioredis: path.resolve(currentDir, 'node_modules/ioredis/built/index.js')
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
