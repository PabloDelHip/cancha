import { ref } from 'vue'
import { leagueService, USE_MOCKS } from '@/services'

/** Nombre de cada liga pública (id → nombre), pedido una vez y compartido entre vistas. */
const names = ref(new Map<string, string>())
let pending: Promise<void> | null = null

export function useLeagueNames() {
  if (!pending && !USE_MOCKS) {
    pending = leagueService
      .list()
      .then((list) => {
        names.value = new Map(list.map((l) => [l.id, l.name]))
      })
      .catch(() => {
        pending = null // se reintenta en la próxima vista
      })
  }
  return { leagueName: (id: string | null | undefined) => (id ? names.value.get(id) : undefined) }
}
