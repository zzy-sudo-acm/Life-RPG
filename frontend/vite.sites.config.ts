import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    copyPublicDir: false,
    emptyOutDir: false,
    outDir: 'dist/server',
    rollupOptions: {
      input: 'src/sites-worker.ts',
      preserveEntrySignatures: 'strict',
      output: {
        entryFileNames: 'index.js',
        format: 'es',
      },
    },
  },
})
