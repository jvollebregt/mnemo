/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';

// Which build this is, shown quietly on the settings page: the day it was built and its commit.
const commit = (() => {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return '';
  }
})();

export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD__: JSON.stringify({ date: new Date().toISOString().slice(0, 10), commit }),
  },
  // Capacitor serves the build from the app bundle, so asset paths must be relative.
  base: './',
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
