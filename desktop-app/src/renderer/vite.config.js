import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname),
  base: './', // Use relative paths for Electron
  build: {
    outDir: path.resolve(__dirname, '../../dist-new'),
    emptyOutDir: true
  },
  server: {
    port: 5173
  }
})
