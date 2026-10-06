import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  /**
   * El frontend siempre llama a `/api` en SU MISMO dominio: la cookie de sesión (refresh token) es
   * de primera parte y sobrevive a las recargas en cualquier navegador (también Safari/iPhone).
   * - Producción: Firebase Hosting reenvía /api/** a Cloud Run (firebase.json).
   * - Desarrollo: este proxy reenvía /api al backend (local por defecto; API_PROXY_TARGET para
   *   apuntar a otro, p. ej. el de Cloud Run).
   */
  const apiTarget = env.API_PROXY_TARGET || 'http://localhost:3000'
  return {
    plugins: [vue(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      proxy: { '/api': { target: apiTarget, changeOrigin: true, secure: true } },
    },
    preview: {
      proxy: { '/api': { target: apiTarget, changeOrigin: true, secure: true } },
    },
  }
})
