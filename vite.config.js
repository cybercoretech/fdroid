import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
