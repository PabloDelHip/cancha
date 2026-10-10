import { ref } from 'vue'
import type { Venue } from '@/types'
import { USE_MOCKS, venueService } from '@/services'

// Sedes del organizador compartidas entre pantallas (selector de cancha, administración).
const venues = ref<Venue[]>([])
let loading: Promise<void> | null = null

/** Sedes y canchas del organizador. Sin servidor (modo demo) queda vacío. */
export function useVenues() {
  function load(force = false) {
    if (USE_MOCKS) return Promise.resolve()
    if (!loading || force) {
      loading = venueService
        .list()
        .then((list) => {
          venues.value = list
        })
        .catch(() => {
          loading = null
        })
    }
    return loading
  }
  function set(list: Venue[]) {
    venues.value = list
  }
  return { venues, load, set }
}
