import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { setSessionExpiredHandler } from './services/api'
import { useAuthStore } from './stores/auth'
import { posthogLog } from './services/posthogLogs'
import { captureException, initAnalytics } from './services/analytics'
import './assets/main.css'

// PostHog solo en producción real (ver services/analytics.ts): en desarrollo/localhost no se inicializa.
initAnalytics()

const app = createApp(App).use(createPinia()).use(router)

app.config.errorHandler = (error) => {
  captureException(error)
  if (import.meta.env.DEV) console.error(error)
}

// Si la sesión no puede renovarse (refresh caducado o revocado), se limpia el estado local
// y, si el usuario estaba en el panel, se le lleva al login conservando la ruta.
setSessionExpiredHandler(() => {
  useAuthStore().clear()
  const current = router.currentRoute.value
  if (current.matched.some((record) => record.meta.requiresAuth)) {
    router.replace({ name: 'login', query: { redirect: current.fullPath } })
  }
})

app.mount('#app')

posthogLog.info('application mounted', {
  runtime: 'vue',
})
