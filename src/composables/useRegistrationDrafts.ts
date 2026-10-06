import { useRouter } from 'vue-router'
import type { RegistrationDraftSummary } from '@/types'
import { getErrorMessage } from '@/services'
import { useHomeStore } from '@/stores'
import { useConfirm } from './useConfirm'
import { useToast } from './useToast'

/** Equipo y torneo de una inscripción a medias, en palabras. */
export function draftLabel(d: RegistrationDraftSummary) {
  return d.team ? `${d.team.name} en ${d.tournament.name}` : `un equipo en ${d.tournament.name}`
}

/**
 * Continuar o cancelar una inscripción a medias (panel y aviso al entrar). Continuar vuelve al
 * enlace, que retoma el borrador en el paso guardado. Cancelar solo borra el borrador: el equipo,
 * su plantilla y los jugadores creados por el camino se conservan.
 */
export function useRegistrationDrafts() {
  const router = useRouter()
  const home = useHomeStore()
  const { confirm } = useConfirm()
  const toast = useToast()

  function resume(d: RegistrationDraftSummary) {
    if (d.token) return router.push({ name: 'join', params: { token: d.token } })
  }

  async function cancel(d: RegistrationDraftSummary) {
    const ok = await confirm({
      title: '¿Cancelar esta inscripción?',
      message: `Se descarta lo que llevabas de ${draftLabel(d)}. Tu equipo, su plantilla y los jugadores que registraste se conservan.`,
      confirmLabel: 'Cancelar inscripción',
      cancelLabel: 'Volver',
      tone: 'danger',
    })
    if (!ok) return false
    try {
      await home.cancelDraft(d.tournament.id)
      toast.success('Inscripción cancelada.')
      return true
    } catch (e) {
      toast.error(getErrorMessage(e))
      return false
    }
  }

  return { resume, cancel }
}
