import { watchEffect, toValue, type MaybeRefOrGetter } from 'vue'

/** Título dinámico para vistas de detalle (torneo, equipo, jugador…). */
export function usePageTitle(title: MaybeRefOrGetter<string | undefined>) {
  watchEffect(() => {
    const value = toValue(title)
    if (value) document.title = `${value} · Cancha`
  })
}
