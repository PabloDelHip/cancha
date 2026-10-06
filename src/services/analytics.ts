import posthog from 'posthog-js'
import { watch, type WatchSource } from 'vue'

/**
 * Única puerta de PostHog. Solo se inicializa y envía en PRODUCCIÓN real:
 *  - build de producción (`import.meta.env.PROD`; `vite` dev nunca),
 *  - con token y host configurados,
 *  - y servido desde un dominio público (nunca localhost, 127.x, ::1, *.local ni IP de red local,
 *    p. ej. `vite preview` o un build probado en el móvil por la LAN).
 * Si no se cumple, posthog.init no se llama y ninguna captura, log, excepción ni pageview sale.
 */
const token = import.meta.env.VITE_POSTHOG_PROJECT_TOKEN
const host = import.meta.env.VITE_POSTHOG_HOST

const LOCAL_HOST = /^(localhost|.*\.localhost|.*\.local|127(\.\d{1,3}){3}|0\.0\.0\.0|\[?::1\]?|10(\.\d{1,3}){3}|192\.168(\.\d{1,3}){2}|172\.(1[6-9]|2\d|3[01])(\.\d{1,3}){2})$/i

export function isLocalHostname(hostname: string): boolean {
  return LOCAL_HOST.test(hostname)
}

export const analyticsEnabled: boolean =
  import.meta.env.PROD && Boolean(token && host) && typeof window !== 'undefined' && !isLocalHostname(window.location.hostname)

// ─── Privacidad: lo que nunca sale hacia PostHog ─────────────────────────────

/**
 * Propiedades personales que no se envían aunque alguna llamada las incluyera. `title`/`$title`:
 * el SDK manda document.title, que en perfiles y partidos lleva nombres de jugadores y equipos.
 */
const PII_KEYS = new Set([
  'title', '$title',
  'email', '$email', 'name', '$name', 'firstName', 'lastName', 'first_name', 'last_name', 'fullName', 'full_name',
  'birthDate', 'birth_date', 'phone', '$phone', 'password', 'accessToken', 'refreshToken', 'access_token', 'refresh_token',
  // OJO: `token` NO va aquí: es el project token de PostHog y sin él el SDK descarta el evento.
])
/** El token del enlace privado de inscripción (/join/:token) viaja en URLs y referrers. */
const JOIN_TOKEN = /(\/join\/)[^/?#&]+/gi
const JOIN_TOKEN_ENCODED = /(%2Fjoin%2F)[^%&#]+/gi
/** ¿La URL actual lleva el token privado de inscripción? (los logs adjuntan la URL sin filtrar). */
export const onSecretUrl = () => typeof window !== 'undefined' && /\/join\//i.test(window.location.pathname)
export const redactUrl = (value: string) => value.replace(JOIN_TOKEN, '$1:token').replace(JOIN_TOKEN_ENCODED, '$1%3Atoken')

function scrub(props: Record<string, unknown> | undefined) {
  if (!props) return
  for (const key of Object.keys(props)) {
    if (PII_KEYS.has(key)) delete props[key]
    else if (typeof props[key] === 'string') props[key] = redactUrl(props[key] as string)
  }
}

type CaptureResult = { properties: Record<string, unknown>; $set?: Record<string, unknown>; $set_once?: Record<string, unknown> }

/** before_send: última barrera para TODO evento (manual, $pageview, $autocapture, $exception, $identify…). */
export function scrubEvent<T extends CaptureResult | null>(event: T): T {
  if (!event) return event
  scrub(event.properties)
  scrub(event.$set)
  scrub(event.$set_once)
  return event
}

export function initAnalytics() {
  if (!analyticsEnabled) return
  posthog.init(token!, {
    api_host: host,
    defaults: '2026-01-30',
    // Única fuente de $pageview en la SPA: el SDK captura la carga inicial y cada cambio de ruta
    // (History API de Vue Router). No hay capturas manuales de $pageview en el router.
    capture_pageview: 'history_change',
    // Clics sí, texto no: los botones y enlaces contienen nombres de jugadores y equipos.
    mask_all_text: true,
    mask_all_element_attributes: true,
    // Si la grabación de sesiones está activa en el proyecto, sin texto ni valores de formularios.
    session_recording: { maskAllInputs: true, maskTextSelector: '*' },
    before_send: (event) => scrubEvent(event),
    // Sin /flags: esa petición manda person_properties ($initial_current_url, que puede ser
    // /join/<token>) SIN pasar por before_send. La app no usa feature flags, encuestas ni
    // experimentos. Consecuencia: la configuración remota (incl. grabación de sesiones) no se carga.
    advanced_disable_flags: true,
    logs: {
      serviceName: 'atletas-front',
      environment: import.meta.env.MODE,
    },
  })
}

// ─── API usada por la app ────────────────────────────────────────────────────

/** Valores permitidos en propiedades: ids técnicos, contadores, estados. Nunca nombres. */
export type EventProps = Record<string, string | number | boolean | null>

export function track(event: string, props: EventProps = {}) {
  if (analyticsEnabled) posthog.capture(event, props)
}

/** distinct_id = User.id. Sin propiedades de persona (nada de email ni nombre). */
export function identifyUser(userId: string) {
  if (analyticsEnabled && userId) posthog.identify(userId)
}

export function resetAnalytics() {
  if (analyticsEnabled) posthog.reset()
}

export function captureException(error: unknown) {
  if (analyticsEnabled) posthog.captureException(error)
}

/**
 * Evento de vista de una entidad pública: se envía UNA vez por entidad cuando `loadedId` pasa a ser
 * su id (carga correcta). Errores, 404 y 403 dejan `loadedId` en null → nada. Re-renders, recargas
 * de la misma entidad o cambios de pestaña no lo repiten; navegar a otra entidad (o volver) sí.
 */
export function trackViewOnce(event: string, loadedId: WatchSource<string | null | undefined>, props: () => EventProps) {
  let last: string | null = null
  watch(
    loadedId,
    (id) => {
      if (!id || id === last) return
      last = id
      track(event, props())
    },
    { immediate: true },
  )
}
