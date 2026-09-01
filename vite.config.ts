import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

// Publicado en GitHub Pages como sitio de proyecto (https://pegasush2.github.io/Pegasus_Coach/),
// igual que Pegasus Tracker — todo tiene que vivir bajo ese subpath, no en la raíz.
const base = process.env.GITHUB_PAGES ? '/Pegasus_Coach/' : '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-64.png'],
      manifest: {
        name: 'Pegasus Coach',
        short_name: 'Coach',
        description: 'Control de macros, peso y progreso — Pegasus Coach',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Cachea el shell de la app (JS/CSS/HTML) para carga instantánea al
        // reabrir — los datos siguen viniendo siempre de Supabase, no offline.
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
  },
  server: {
    port: 5173,
    strictPort: true,
  },
})
