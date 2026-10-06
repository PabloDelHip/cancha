import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { ID, Team, TeamInput, UploadProgress } from '@/types'
import { teamService } from '@/services'
import { createLoader, createOwnership } from './loader'

export const useTeamsStore = defineStore('teams', () => {
  const items = ref<Team[]>([])

  const { loaded, ensure } = createLoader(async () => {
    items.value = await teamService.list()
  })

  const ownership = createOwnership(() => teamService.listMine())

  const byId = computed(() => new Map(items.value.map((t) => [t.id, t])))
  const sorted = computed(() => [...items.value].sort((a, b) => a.name.localeCompare(b.name)))
  /** Equipos que registró el usuario autenticado. */
  const mine = computed(() => sorted.value.filter((t) => ownership.ownedIds.value.has(t.id)))

  function get(id: ID | null | undefined) {
    return id ? byId.value.get(id) : undefined
  }
  function nameOf(id: ID) {
    return byId.value.get(id)?.name ?? 'Equipo'
  }

  async function create(input: TeamInput) {
    const created = await teamService.create(input)
    items.value.push(created)
    ownership.markMine(created.id)
    return created
  }
  async function update(id: ID, input: Partial<TeamInput>) {
    const updated = await teamService.update(id, input)
    items.value = items.value.map((t) => (t.id === id ? updated : t))
    return updated
  }
  /** Logo en Cloudinary (vía API): reemplaza el equipo en memoria con la URL que devuelve el servidor. */
  async function setLogo(id: ID, image: Blob, onProgress?: UploadProgress) {
    const updated = await teamService.uploadLogo(id, image, onProgress)
    items.value = items.value.map((t) => (t.id === id ? updated : t))
    return updated
  }
  async function removeLogo(id: ID) {
    const updated = await teamService.removeLogo(id)
    items.value = items.value.map((t) => (t.id === id ? updated : t))
    return updated
  }

  return {
    items,
    loaded,
    ensure,
    sorted,
    mine,
    ensureMine: ownership.ensureMine,
    isMine: ownership.isMine,
    canEdit: ownership.canEdit,
    markMine: ownership.markMine,
    resetMine: ownership.resetMine,
    get,
    nameOf,
    create,
    update,
    setLogo,
    removeLogo,
  }
})
