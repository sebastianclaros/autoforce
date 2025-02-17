import { defineConfig } from 'vitest/config';
import { name } from './package.json';

export default defineConfig({
  esbuild: {
    jsxInject: "import React from 'react'",
  },
  test: {
    setupFiles: './src/__tests__/setup.ts',
    environment: 'jsdom',
    globals: true,
    alias: {
      '@': './src',
      [name]: './src',
    },
    coverage: {
      reporter: ['text', 'text-summary', 'json', 'lcov'],
    },
  },
});