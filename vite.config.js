import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { sites } from './build/sites-vite-plugin.js'

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  build:
    process.env.SITES_BUILD === 'true'
      ? {
          outDir: 'dist/client',
        }
      : undefined,
  plugins: [react(), ...(process.env.SITES_BUILD === 'true' ? [sites()] : [])],
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
