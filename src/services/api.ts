import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

/**
 * Cliente HTTP del API NestJS.
 * Mientras VITE_USE_MOCKS !== 'false', los servicios usan la capa mock.
 */
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false'

export const api = axios.create({
  // Mismo dominio siempre (ver vite.config.ts / firebase.json): cookie de sesión de primera parte.
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
  // Necesario para enviar/recibir la cookie HttpOnly del refresh token (otro puerto = otro origen).
  withCredentials: true,
})

// ─── Access token (solo en memoria) ─────────────────────────────────────────
//
// El access token vive en memoria (aquí y en el authStore), nunca en localStorage.
// El refresh token vive en una cookie HttpOnly que JS no puede leer.

let accessToken: string | null = null
let onSessionExpired: (() => void) | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

/** Se invoca cuando la sesión no puede renovarse (el authStore limpia y redirige). */
export function setSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

// ─── Refresh automático con single-flight ───────────────────────────────────

/** Endpoints que nunca disparan un refresh (evita recursión y bucles). */
const NO_REFRESH = ['/auth/refresh', '/auth/login', '/auth/register', '/auth/logout']

export interface AuthPayload {
  user: { id: string; email: string; firstName: string; lastName: string; role: string }
  accessToken: string
  expiresIn: number
}

let refreshing: Promise<AuthPayload> | null = null

/**
 * Renueva el access token usando la cookie. Si varias peticiones reciben 401 a la vez,
 * todas esperan la MISMA promesa: un solo POST /auth/refresh.
 */
export function refreshSession(): Promise<AuthPayload> {
  refreshing ??= requestRefresh()
    .then((payload) => {
      setAccessToken(payload.accessToken)
      return payload
    })
    .finally(() => {
      refreshing = null
    })
  return refreshing
}

async function requestRefresh(): Promise<AuthPayload> {
  try {
    return (await api.post<AuthPayload>('/auth/refresh')).data
  } catch (error) {
    // Otra pestaña pudo rotar la cookie un instante antes: un único reintento con la cookie nueva.
    if (error instanceof AxiosError && error.response?.status === 401) {
      await new Promise((resolve) => setTimeout(resolve, 400))
      return (await api.post<AuthPayload>('/auth/refresh')).data
    }
    throw error
  }
}

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean }

api.interceptors.response.use(undefined, async (error: unknown) => {
  if (!(error instanceof AxiosError) || error.response?.status !== 401 || !error.config) throw error
  const original = error.config as RetriableConfig
  if (original._retried || NO_REFRESH.some((path) => original.url?.startsWith(path))) throw error

  original._retried = true // como mucho un reintento por petición
  try {
    const { accessToken: token } = await refreshSession()
    original.headers.Authorization = `Bearer ${token}`
  } catch {
    setAccessToken(null)
    onSessionExpired?.()
    throw error
  }
  return api(original)
})

// ─── Paginación ─────────────────────────────────────────────────────────────

/** Respuesta paginada del backend. */
export interface Paginated<T> {
  data: T[]
  meta: { page: number; limit: number; total: number; totalPages: number }
}

const PAGE_LIMIT = 100

/**
 * Descarga todas las páginas de un listado. El frontend del MVP calcula tabla,
 * goleadores y perfiles en cliente a partir de colecciones completas; el backend
 * pagina (máx. 100 por página) y aquí se recorren las páginas para que stores y
 * vistas no conozcan la paginación. Ver README: limitación conocida del MVP.
 */
export async function fetchAll<T>(url: string, params: Record<string, unknown> = {}): Promise<T[]> {
  const first = (await api.get<Paginated<T>>(url, { params: { ...params, page: 1, limit: PAGE_LIMIT } })).data
  const rest = await Promise.all(
    Array.from({ length: first.meta.totalPages - 1 }, (_, i) =>
      api.get<Paginated<T>>(url, { params: { ...params, page: i + 2, limit: PAGE_LIMIT } }),
    ),
  )
  return [...first.data, ...rest.flatMap((r) => r.data.data)]
}

// ─── Errores ────────────────────────────────────────────────────────────────

/** Código HTTP del error: de Axios o de los errores mock (que imitan al API con `status`). */
export function getErrorStatus(error: unknown): number | undefined {
  if (error instanceof AxiosError) return error.response?.status
  const status = (error as { status?: unknown } | null)?.status
  return typeof status === 'number' ? status : undefined
}

/** Mensaje legible para mostrar en la UI a partir de cualquier error. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const status = error.response?.status
    if (status === 429) return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.'
    if (status === 401) return 'Tu sesión expiró. Inicia sesión de nuevo.'
    const data = error.response?.data as { message?: string | string[] } | undefined
    const message = Array.isArray(data?.message) ? data.message.join(', ') : data?.message
    if (message) return message
    if (error.code === 'ECONNABORTED') return 'La solicitud tardó demasiado. Intenta de nuevo.'
    if (!error.response) return 'No se pudo conectar con el servidor.'
  }
  if (error instanceof Error) return error.message
  return 'Ocurrió un error inesperado.'
}
