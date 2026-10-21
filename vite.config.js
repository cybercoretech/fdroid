import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // React's library-mode bundle otherwise leaves this Node global in the
  // browser output, which stops React from mounting on static GitHub Pages.
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    outDir: 'assets',
    emptyOutDir: false,
    minify: true,
    lib: {
      entry: 'src/react/main.jsx',
      name: 'CybercoreFdroidWidgets',
      formats: ['iife'],
      fileName: () => 'fdroid-react.js',
      cssFileName: 'fdroid-react',
    },
  },
});
