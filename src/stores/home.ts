import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { ID, UserHome } from '@/types'
import { meService } from '@/services/meService'
import { createLoader } from './loader'
import { useTournamentsStore } from './tournaments'

/** Por pestaña: "Continuar después" no vuelve a preguntar hasta la próxima sesión o el próximo login. */
const PROMPT_DISMISSED = 'kikovo:draft-prompt-dismissed'

function readDismissed() {
  try {
    return sessionStorage.getItem(PROMPT_DISMISSED) === '1'
  } catch {
    return false
  }
}
function writeDismissed(value: boolean) {
  try {
    if (value) sessionStorage.setItem(PROMPT_DISMISSED, '1')
    else sessionStorage.removeItem(PROMPT_DISMISSED)
  } catch {
    // sin storage: el aviso puede repetirse al recargar; no rompe nada
  }
}

/**
 * Capacidades reales de la cuenta para adaptar el panel: si puede organizar torneos (la activó o
 * ya organiza alguno), cuántos equipos administra y sus inscripciones a medias o enviadas.
 * Nunca se basa en User.role.
 */
export const useHomeStore = defineStore('home', () => {
  const data = ref<UserHome | null>(null)
  const promptDismissed = ref(readDismissed())

  const loader = createLoader(async () => {
    data.value = await meService.home()
  })

  /** Organiza si el servidor lo dice o si ya tiene torneos cargados (p. ej. recién creado uno). */
  const canOrganize = computed(() => !!data.value?.organizer.canOrganize || useTournamentsStore().mine.length > 0)
  const drafts = computed(() => data.value?.registrations.drafts ?? [])
  const pendingRequests = computed(() => data.value?.registrations.pendingRequests ?? [])
  const teamCount = computed(() => data.value?.teams.total ?? 0)
  /** La inscripción a medias más reciente que aún se puede continuar (para el aviso al entrar). */
  const resumable = computed(() => drafts.value.find((d) => d.token) ?? null)

  async function enableOrganizer() {
    await meService.enableOrganizer()
    await loader.ensure(true)
  }

  async function cancelDraft(tournamentId: ID) {
    await meService.cancelDraft(tournamentId)
    if (data.value) {
      data.value = {
        ...data.value,
        registrations: { ...data.value.registrations, drafts: data.value.registrations.drafts.filter((d) => d.tournament.id !== tournamentId) },
      }
    }
  }

  function dismissPrompt() {
    promptDismissed.value = true
    writeDismissed(true)
  }

  /** Al cerrar sesión o entrar con otra cuenta. `freshLogin`: tras un login explícito vuelve a avisar. */
  function reset(freshLogin = false) {
    data.value = null
    loader.reset()
    if (freshLogin) {
      promptDismissed.value = false
      writeDismissed(false)
    }
  }

  return {
    data,
    loaded: loader.loaded,
    ensure: loader.ensure,
    canOrganize,
    drafts,
    pendingRequests,
    teamCount,
    resumable,
    promptDismissed,
    enableOrganizer,
    cancelDraft,
    dismissPrompt,
    reset,
  }
})
