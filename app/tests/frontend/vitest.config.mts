import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: path.resolve(currentDir, '../..'),
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react'
  },
  resolve: {
    alias: {
      'react-router-dom': path.resolve(currentDir, '../../frontend/node_modules/react-router-dom')
    }
  },
  test: {
    environment: 'jsdom',
    setupFiles: [path.resolve(currentDir, 'support/setup.ts')],
    include: ['tests/frontend/**/*.test.ts', 'tests/frontend/**/*.test.tsx'],
    clearMocks: true,
    globals: true
  }
});
