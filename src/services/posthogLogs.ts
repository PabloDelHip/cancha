import posthog from 'posthog-js'
import { analyticsEnabled, onSecretUrl } from './analytics'

type LogAttributes = Record<string, boolean | number | string>

/**
 * Logs de PostHog: misma puerta que los eventos (solo producción, nunca localhost). El SDK adjunta
 * la URL completa (`url.full`) sin pasar por before_send: en /join/<token> no se registra nada.
 */
export const posthogLog = {
  info(message: string, attributes: LogAttributes) {
    if (analyticsEnabled && !onSecretUrl()) posthog.logger.info(message, attributes)
  },
}
