import { computed, inject, provide, ref, watch, type InjectionKey } from 'vue'
import type { ID, RosterPeriod, Team, TeamAdmins, TeamRole, TeamTournamentEntry } from '@/types'
import { getErrorMessage, getErrorStatus, teamManagementService, teamService, USE_MOCKS } from '@/services'
import { useAuthStore } from '@/stores/auth'

export type TeamWorkspaceState = 'loading' | 'ready' | 'forbidden' | 'not-found' | 'error' | 'unsupported'

/**
 * Mensaje de error para acciones de administración del equipo: 403/404 con texto propio; 409 y
 * validaciones con el mensaje de dominio del servidor (nunca un "algo salió mal" genérico).
 */
export function teamActionError(error: unknown, notFound = 'El equipo o jugador ya no está disponible.'): string {
  const status = getErrorStatus(error)
  if (status === 403) return 'No tienes permisos para realizar esta acción.'
  if (status === 404) return notFound
  return getErrorMessage(error)
}

/**
 * Estado del workspace de UN equipo (administración global, no un torneo). Se crea en la vista del
 * workspace y lo leen sus pestañas. Carga en paralelo: ficha pública, administradores, plantilla
 * global actual y torneos donde juega. El rol sale de la respuesta del servidor (GET /admins: 403 = no administras el
 * equipo), así funciona igual al entrar por enlace directo que desde "Mis equipos".
 */
function createTeamManagement(teamId: () => ID) {
  const auth = useAuthStore()
  const state = ref<TeamWorkspaceState>('loading')
  const errorMessage = ref('')
  const team = ref<Team | null>(null)
  const admins = ref<TeamAdmins | null>(null)
  const roster = ref<RosterPeriod[]>([])
  const tournaments = ref<TeamTournamentEntry[]>([])

  const myRole = computed<TeamRole | null>(() => {
    const me = auth.user?.id
    if (!me || !admins.value) return null
    if (admins.value.owner?.userId === me) return 'owner'
    return admins.value.managers.some((m) => m.userId === me) ? 'manager' : null
  })
  const isOwner = computed(() => myRole.value === 'owner')
  const adminCount = computed(() => (admins.value ? (admins.value.owner ? 1 : 0) + admins.value.managers.length : 0))

  async function load() {
    if (USE_MOCKS) {
      state.value = 'unsupported'
      return
    }
    state.value = 'loading'
    const id = teamId()
    try {
      const [t, a, r, tt] = await Promise.all([
        teamService.get(id),
        teamManagementService.admins(id),
        teamManagementService.roster(id, 'active'),
        teamManagementService.tournaments(id),
      ])
      team.value = t
      admins.value = a
      roster.value = r
      tournaments.value = tt
      state.value = 'ready'
    } catch (e) {
      const status = getErrorStatus(e)
      state.value = status === 403 ? 'forbidden' : status === 404 ? 'not-found' : 'error'
      errorMessage.value = getErrorMessage(e)
    }
  }

  /**
   * Error de una acción: mensaje para mostrar y, si el servidor responde 403 (p. ej. le quitaron el
   * rol con la pantalla abierta), se vuelve a comprobar el acceso: la vista pasa a "No administras
   * este equipo" en vez de seguir ofreciendo acciones con permisos que ya no tiene.
   */
  async function actionFailed(error: unknown, notFound?: string) {
    const message = teamActionError(error, notFound)
    if (getErrorStatus(error) === 403) await load()
    return message
  }

  async function reloadAdmins() {
    admins.value = await teamManagementService.admins(teamId())
  }
  async function reloadRoster() {
    roster.value = await teamManagementService.roster(teamId(), 'active')
  }

  async function reloadTournaments() {
    tournaments.value = await teamManagementService.tournaments(teamId())
  }

  watch(teamId, load, { immediate: true })

  return { state, errorMessage, team, admins, roster, tournaments, myRole, isOwner, adminCount, load, reloadAdmins, reloadRoster, reloadTournaments, actionFailed, teamId }
}

export type TeamManagement = ReturnType<typeof createTeamManagement>
const KEY: InjectionKey<TeamManagement> = Symbol('team-management')

export function provideTeamManagement(teamId: () => ID) {
  const ctx = createTeamManagement(teamId)
  provide(KEY, ctx)
  return ctx
}

/** Igual, pero fuera del workspace devuelve null (p. ej. el diálogo de plantilla en la inscripción por link). */
export function useOptionalTeamManagement(): TeamManagement | null {
  return inject(KEY, null)
}

export function useTeamManagement(): TeamManagement {
  const ctx = inject(KEY)
  if (!ctx) throw new Error('useTeamManagement() fuera del workspace del equipo')
  return ctx
}
