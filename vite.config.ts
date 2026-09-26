/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// VITE_CACHE_DIR lets several dev servers run at once, each with its own
// dependency cache (for example .build-review/vite-cache-5301).
export default defineConfig({
  plugins: [react()],
  cacheDir: process.env.VITE_CACHE_DIR || 'node_modules/.vite',
  server: {
    // Content lives outside src/ (content/*.json) and is read at build time.
    fs: { allow: ['.'] },
    watch: {
      // Other agents' scratch files (.build-review/) and build output
      // (dist/) aren't source: watching them causes unrelated full-page
      // reloads (and, worse, mid-render blanks) while several agents work
      // in this repo at once.
      ignored: ['**/.build-review/**', '**/dist/**'],
    },
  },
  // The dev-only reference viewer (src/dev) pulls in lucide-react (all its
  // icons are its own modules), which Vite only discovers by crawling — so
  // the first request to /dev/components or /dev/screens/* triggers a
  // dependency re-optimize and a full reload. Listing it here avoids that
  // reload racing a page's first render (and Playwright's wait for it).
  optimizeDeps: {
    include: ['lucide-react'],
  },
  build: {
    target: 'es2022',
    // No source maps in production: smaller downloads on bad connections.
    sourcemap: false,
    rolldownOptions: {
      output: {
        // Separate chunks so an app update doesn't re-download the lesson
        // text or the libraries, and vice versa.
        codeSplitting: {
          groups: [
            { name: 'content', test: /[\\/]content[\\/].*\.json$/ },
            { name: 'vendor', test: /[\\/]node_modules[\\/]/ },
          ],
        },
      },
    },
    // The content chunk is all 24 lessons (~85 kB gzipped); it is expected.
    chunkSizeWarningLimit: 600,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
    restoreMocks: true,
  },
});
