import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: path.resolve(__dirname, '../..'),
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react'
  },
  resolve: {
    alias: {
      'react-router-dom': path.resolve(__dirname, '../../frontend/node_modules/react-router-dom')
    }
  },
  test: {
    environment: 'jsdom',
    setupFiles: [path.resolve(__dirname, 'support/setup.ts')],
    include: ['tests/frontend/**/*.test.ts', 'tests/frontend/**/*.test.tsx'],
    clearMocks: true,
    globals: true
  }
});
