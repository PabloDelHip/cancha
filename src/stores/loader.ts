import { ref } from 'vue'

/**
 * Carga perezosa y deduplicada: varias vistas pueden pedir los mismos datos
 * a la vez sin disparar peticiones repetidas.
 */
export function createLoader(load: () => Promise<void>) {
  const loaded = ref(false)
  let pending: Promise<void> | null = null

  function ensure(force = false): Promise<void> {
    if (loaded.value && !force) return Promise.resolve()
    pending ??= load()
      .then(() => {
        loaded.value = true
      })
      .finally(() => {
        pending = null
      })
    return pending
  }

  function reset() {
    loaded.value = false
  }

  return { loaded, ensure, reset }
}

/**
 * Qué recursos aparecen en el panel del usuario y cuáles puede editar:
 * - `isMine`: torneos propios; equipos/jugadores que participan en ellos o que registró.
 * - `canEdit`: puede editar la ficha maestra (la creó). Participar ≠ poder editar.
 * Se guardan solo ids: los objetos siguen en la colección pública del store.
 */
export function createOwnership(loadRefs: () => Promise<{ id: string; canEdit: boolean }[]>) {
  const ids = ref(new Set<string>())
  const editable = ref(new Set<string>())
  const loader = createLoader(async () => {
    const refs = await loadRefs()
    ids.value = new Set(refs.map((r) => r.id))
    editable.value = new Set(refs.filter((r) => r.canEdit).map((r) => r.id))
  })

  return {
    ownedIds: ids,
    ensureMine: loader.ensure,
    isMine: (id: string) => ids.value.has(id),
    canEdit: (id: string) => editable.value.has(id),
    markMine: (id: string, canEdit = true) => {
      ids.value = new Set(ids.value).add(id)
      if (canEdit) editable.value = new Set(editable.value).add(id)
    },
    resetMine: () => {
      ids.value = new Set()
      editable.value = new Set()
      loader.reset()
    },
  }
}
