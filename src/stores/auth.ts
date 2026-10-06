import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { User } from '@/types'
import { authService, type Credentials, type RegisterInput, type Session } from '@/services/authService'
import { getErrorMessage, setAccessToken } from '@/services/api'
import { usePlayersStore } from './players'
import { useTeamsStore } from './teams'
import { useTournamentsStore } from './tournaments'
import { useHomeStore } from './home'
import { identifyUser as identifyAnalytics, resetAnalytics } from '@/services/analytics'

/**
 * Indicador (no secreto) de que en este navegador hubo una sesión. Permite que el área
 * pública muestre "Mi panel" sin intentar un refresh en cada visita anónima.
 * No contiene tokens: el refresh token real es una cookie HttpOnly que JS no ve.
 */
const SESSION_HINT = 'cancha:has-session'
/** PostHog: distinct_id = User.id y nada más (sin email, nombre ni rol). */
function identifyUser(user: User) {
  identifyAnalytics(user.id)
}

function setHint(value: boolean) {
  try {
    if (value) localStorage.setItem(SESSION_HINT, '1')
    else localStorage.removeItem(SESSION_HINT)
  } catch {
    // sin storage: el header público mostrará "Iniciar sesión"
  }
}
function hasHint() {
  try {
    return localStorage.getItem(SESSION_HINT) === '1'
  } catch {
    return false
  }
}

/**
 * Sesión del organizador.
 * - Backend real: el access token vive solo aquí, en memoria (y en el cliente HTTP); el
 *   refresh token es una cookie HttpOnly. Nada se persiste en localStorage.
 * - Mock: sin tokens; la sesión demo la guarda authService (mocks/session.ts).
 */
export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const accessToken = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const initialized = ref(false)
  const isInitializing = ref(false)
  let initializing: Promise<void> | null = null

  const isAuthenticated = computed(() => user.value !== null)
  /** Sesión probable en este navegador (para el header público, antes de inicializar). */
  const mayHaveSession = computed(() => isAuthenticated.value || (!initialized.value && hasHint()))

  function applySession(session: Session) {
    user.value = session.user
    accessToken.value = session.accessToken
    setAccessToken(session.accessToken)
    setHint(true)
    identifyUser(session.user)
  }

  /** Olvida la sesión local y lo que dependía del usuario (recursos "míos"). */
  function clear() {
    if (user.value) resetAnalytics()

    user.value = null
    accessToken.value = null
    setAccessToken(null)
    setHint(false)
    useTournamentsStore().resetMine()
    useTeamsStore().resetMine()
    usePlayersStore().resetMine()
    useHomeStore().reset()
  }

  async function run(action: () => Promise<void>) {
    loading.value = true
    error.value = null
    try {
      await action()
    } catch (e) {
      error.value = getErrorMessage(e)
      throw e
    } finally {
      loading.value = false
    }
  }

  function login(credentials: Credentials) {
    return run(async () => {
      clear()
      applySession(await authService.login(credentials))
      useHomeStore().reset(true) // login explícito: vuelve a avisar de inscripciones pendientes
      initialized.value = true
    })
  }

  function register(input: RegisterInput) {
    return run(async () => {
      clear()
      applySession(await authService.register(input))
      useHomeStore().reset(true)
      initialized.value = true
    })
  }

  async function logout() {
    loading.value = true
    try {
      await authService.logout()
    } finally {
      clear()
      loading.value = false
    }
  }

  /** Nuevo access token (API real: POST /auth/refresh con la cookie). */
  async function refresh() {
    const session = await authService.refresh()
    applySession(session)
    return session
  }

  async function fetchMe() {
    user.value = await authService.me()
  }

  /**
   * Restaura la sesión al cargar la app (tras F5): refresh → me. Una sola vez; las llamadas
   * concurrentes esperan la misma promesa. Si no hay sesión, queda como visitante.
   */
  function initializeAuth(): Promise<void> {
    if (initialized.value) return Promise.resolve()
    initializing ??= (async () => {
      isInitializing.value = true
      try {
        await refresh()
        await fetchMe()
      } catch {
        clear()
      } finally {
        initialized.value = true
        isInitializing.value = false
        initializing = null
      }
    })()
    return initializing
  }

  return {
    user,
    accessToken,
    loading,
    error,
    initialized,
    isInitializing,
    isAuthenticated,
    mayHaveSession,
    login,
    register,
    logout,
    refresh,
    fetchMe,
    initializeAuth,
    clear,
  }
})
