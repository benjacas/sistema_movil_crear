import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Nota: services/ y lib/ viven un nivel arriba de front/ (se comparten con el
// sistema de administración). server.fs.allow habilita que Vite pueda leerlos.
//
// Multi-página "tradicional": cada módulo (login, inicio, pagos...) es su
// propio archivo .html con su propio script — no hay router de JavaScript.
// Cuando agreguemos más páginas, hay que sumarlas acá en build.rollupOptions.input.
export default defineConfig({
  root: __dirname,
  server: {
    fs: { allow: ['..'] },
  },
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        home: 'home.html',
      },
    },
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'CREAR — Portal de Alumnos',
        short_name: 'CREAR',
        description: 'Autogestión para alumnos y familias de la Academia de Danzas CREAR',
        theme_color: '#6D5AE6',
        background_color: '#F8F9FC',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
    }),
  ],
})
