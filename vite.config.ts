import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { APP } from './src/brand'

// A config roda no Node, onde process existe; o tsconfig do app so carrega os
// tipos do navegador, entao ele e declarado aqui em vez de trazer @types/node.
declare const process: { env: Record<string, string | undefined> }

/**
 * Grava /version.json com o commit publicado.
 *
 * Existe porque a publicacao deixou de sair sozinha do repositorio: "o que esta
 * no ar" virou uma pergunta de verdade, e a resposta precisa caber num celular,
 * sem painel e sem terminal — basta abrir femivita.online/version.json.
 *
 * Fica FORA do app de proposito. A tela de Ajustes e da compradora, e um numero
 * de commit ali no meio nao diz nada a ela.
 */
const versionJson = (): Plugin => ({
  name: 'version-json',
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'version.json',
      source: JSON.stringify(
        {
          commit: process.env.VITE_BUILD_REF ?? 'local',
          builtAt: new Date().toISOString(),
        },
        null,
        2,
      ),
    })
  },
})

export default defineConfig({
  plugins: [
    react(),
    versionJson(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'silence.mp4'],
      manifest: {
        name: APP.name,
        short_name: APP.shortName,
        description: APP.tagline,
        // Acompanha o idioma principal do app (ver src/i18n). Ficou como pt-BR
        // de quando o app era em portugues; o sistema usa isto para escolher
        // fonte e leitura em voz alta do app instalado.
        lang: 'en-US',
        dir: 'ltr',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: APP.backgroundColor,
        theme_color: APP.themeColor,
        categories: ['health', 'fitness', 'lifestyle'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Everything the app needs is static and small: precache it all so the
        // very first launch is the only one that requires a connection. O PDF
        // do ebook entra no cache (1,1 MB) para o "funciona sem internet" da
        // venda valer também para o livro.
        globPatterns: ['**/*.{js,css,html,png,svg,woff2,mp4,webmanifest,pdf}'],
        // O padrão do workbox recusa arquivos acima de 2 MB; o PDF passa hoje
        // (1,1 MB), mas o limite fica explícito para uma futura edição do
        // ebook não o derrubar do cache em silêncio.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
        // Sem isto, uma chamada a /api/... cairia no index.html do cache e a
        // resposta viria como HTML. Verificacao de licenca nunca sai do cache.
        // /version.json tambem: abrir o endereco no celular e uma navegacao, e
        // sem isto o service worker devolveria o index.html no lugar do arquivo.
        navigateFallbackDenylist: [/^\/api\//, /^\/version\.json$/],
        runtimeCaching: [
          {
            // As rotas de licenca sao NetworkOnly, e isto nao e detalhe: uma
            // resposta 200 guardada em cache faria a revogacao falhar em
            // silencio — o app continuaria abrindo para quem foi reembolsado,
            // e ninguem perceberia, porque por fora tudo parece funcionar.
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
          },
          {
            urlPattern: ({ url }) =>
              url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
})
