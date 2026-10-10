import { createRouter, createWebHistory, type LocationQuery, type RouteLocationRaw, type RouteRecordRaw } from 'vue-router'
import PublicLayout from '@/layouts/PublicLayout.vue'
import { useAuthStore } from '@/stores/auth'

const publicRoutes: RouteRecordRaw[] = [
  { path: '', name: 'home', component: () => import('@/views/public/HomeView.vue'), meta: { title: 'Inicio' } },
  { path: 'leagues', name: 'leagues', component: () => import('@/views/public/LeaguesView.vue'), meta: { title: 'Ligas' } },
  { path: 'leagues/:id', name: 'league', component: () => import('@/views/public/LeagueView.vue'), props: true },
  {
    path: 'tournaments',
    name: 'tournaments',
    component: () => import('@/views/public/TournamentsView.vue'),
    meta: { title: 'Torneos' },
  },
  {
    path: 'tournaments/:id',
    component: () => import('@/views/public/TournamentDetailView.vue'),
    props: true,
    children: [
      { path: '', name: 'tournament', component: () => import('@/views/public/tournament/OverviewTab.vue'), props: true },
      { path: 'informacion', name: 'tournament-information', component: () => import('@/views/public/tournament/InformationTab.vue'), props: true },
      { path: 'tabla', name: 'tournament-standings', component: () => import('@/views/public/tournament/StandingsTab.vue'), props: true },
      { path: 'partidos', name: 'tournament-matches', component: () => import('@/views/public/tournament/MatchesTab.vue'), props: true },
      { path: 'equipos', name: 'tournament-teams', component: () => import('@/views/public/tournament/TeamsTab.vue'), props: true },
      // Los goleadores (y demás rankings) viven en Competición › Estadísticas; enlaces viejos redirigen.
      { path: 'goleadores', name: 'tournament-scorers', redirect: (to) => ({ name: 'tournament-standings', params: to.params, hash: '#estadisticas' }) },
    ],
  },
  { path: 'teams/:id', name: 'team', component: () => import('@/views/public/TeamView.vue'), props: true },
  // Enlace privado de inscripción (Etapa 7): se comparte por WhatsApp. Público; pide sesión al inscribir.
  { path: 'invite/:token', name: 'invite', component: () => import('@/views/public/InviteView.vue'), props: true, meta: { title: 'Invitación a colaborar', focused: true } },
  { path: 'join/:token', name: 'join', component: () => import('@/views/public/JoinView.vue'), props: true, meta: { title: 'Inscribir equipo', focused: true } },
  { path: 'players', name: 'players', component: () => import('@/views/public/PlayersView.vue'), meta: { title: 'Jugadores' } },
  { path: 'players/:id', name: 'player', component: () => import('@/views/public/PlayerView.vue'), props: true },
  { path: 'matches/:id', name: 'match', component: () => import('@/views/public/MatchView.vue'), props: true },
]

/**
 * Rutas antiguas del panel (CRUDs sueltos). Ahora todo vive en el workspace del torneo:
 * con `?tournament=` se redirige a su pestaña; sin él, a "Mis torneos".
 */
function toWorkspace(tab: string): (to: { query: LocationQuery }) => RouteLocationRaw {
  return (to) => {
    const id = to.query.tournament
    if (typeof id !== 'string') return { name: 'admin-tournaments' }
    const query = to.query.new ? { new: '1' } : to.query.filter === 'pending' ? { view: 'pending' } : {}
    return { name: tab, params: { id }, query }
  }
}

const tournamentWorkspace: RouteRecordRaw[] = [
  { path: '', name: 'admin-tournament', component: () => import('@/views/admin/tournament/OverviewTab.vue'), props: true },
  { path: 'equipos', name: 'admin-tournament-teams', component: () => import('@/views/admin/tournament/TeamsTab.vue'), props: true },
  { path: 'equipos/:teamId', name: 'admin-tournament-team', component: () => import('@/views/admin/tournament/TeamRosterView.vue'), props: true },
  { path: 'jugadores', name: 'admin-tournament-players', component: () => import('@/views/admin/tournament/PlayersTab.vue'), props: true },
  { path: 'calendario', name: 'admin-tournament-schedule', component: () => import('@/views/admin/tournament/ScheduleTab.vue'), props: true },
  { path: 'tabla', name: 'admin-tournament-standings', component: () => import('@/views/admin/tournament/StandingsTab.vue'), props: true },
  { path: 'goleadores', name: 'admin-tournament-scorers', component: () => import('@/views/admin/tournament/ScorersTab.vue'), props: true },
  { path: 'disciplina', name: 'admin-tournament-discipline', component: () => import('@/views/admin/tournament/DisciplineTab.vue'), props: true },
  { path: 'inscripciones', name: 'admin-tournament-registration', component: () => import('@/views/admin/tournament/RegistrationTab.vue'), props: true },
  { path: 'colaboradores', name: 'admin-tournament-collaborators', component: () => import('@/views/admin/tournament/CollaboratorsTab.vue'), props: true },
  { path: 'configuracion', name: 'admin-tournament-settings', component: () => import('@/views/admin/tournament/SettingsTab.vue'), props: true },
]

/** Workspace del EQUIPO global (6C): administración fuera de cualquier torneo. */
const teamWorkspace: RouteRecordRaw[] = [
  { path: '', name: 'admin-team', component: () => import('@/views/admin/team/TeamOverviewTab.vue') },
  { path: 'plantilla', name: 'admin-team-roster', component: () => import('@/views/admin/team/TeamRosterTab.vue') },
  { path: 'torneos', name: 'admin-team-tournaments', component: () => import('@/views/admin/team/TeamTournamentsTab.vue') },
  { path: 'administradores', name: 'admin-team-admins', component: () => import('@/views/admin/team/TeamAdminsTab.vue') },
  { path: 'configuracion', name: 'admin-team-settings', component: () => import('@/views/admin/team/TeamSettingsTab.vue') },
]

const adminRoutes: RouteRecordRaw[] = [
  { path: '', name: 'admin-dashboard', component: () => import('@/views/admin/DashboardView.vue'), meta: { title: 'Panel' } },
  { path: 'referees', name: 'admin-referees', component: () => import('@/views/admin/RefereesAdminView.vue'), meta: { title: 'Árbitros · Panel' } },
  { path: 'venues', name: 'admin-venues', component: () => import('@/views/admin/VenuesAdminView.vue'), meta: { title: 'Sedes · Panel' } },
  { path: 'leagues', name: 'admin-leagues', component: () => import('@/views/admin/LeaguesAdminView.vue'), meta: { title: 'Mis ligas · Panel' } },
  { path: 'tournaments', name: 'admin-tournaments', component: () => import('@/views/admin/TournamentsAdminView.vue'), meta: { title: 'Mis torneos · Panel' } },
  {
    path: 'tournaments/:id',
    component: () => import('@/views/admin/tournament/TournamentWorkspaceView.vue'),
    props: true,
    children: tournamentWorkspace,
  },
  { path: 'matches/:id', name: 'admin-match-capture', component: () => import('@/views/admin/MatchCaptureView.vue'), props: true, meta: { title: 'Capturar partido' } },
  {
    path: 'teams',
    name: 'admin-teams',
    component: () => import('@/views/admin/team/MyTeamsView.vue'),
    meta: { title: 'Mis equipos · Panel' },
    // Enlaces antiguos `/admin/teams?tournament=…` siguen llevando a los equipos de ese torneo.
    beforeEnter: (to) => (typeof to.query.tournament === 'string' ? toWorkspace('admin-tournament-teams')(to) : true),
  },
  {
    path: 'teams/:teamId',
    component: () => import('@/views/admin/team/TeamWorkspaceView.vue'),
    props: true,
    children: teamWorkspace,
  },
  { path: 'players', name: 'admin-players', redirect: toWorkspace('admin-tournament-players') },
  { path: 'matches', name: 'admin-matches', redirect: toWorkspace('admin-tournament-schedule') },
]

const routes: RouteRecordRaw[] = [
  { path: '/', component: PublicLayout, children: publicRoutes },
  {
    path: '/admin',
    component: () => import('@/layouts/AdminLayout.vue'),
    // Solo el panel requiere sesión; el área pública nunca.
    meta: { requiresAuth: true },
    children: adminRoutes,
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: { title: 'Iniciar sesión', guestOnly: true },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/views/auth/RegisterView.vue'),
    meta: { title: 'Crear cuenta', guestOnly: true },
  },
  {
    path: '/:pathMatch(.*)*',
    component: PublicLayout,
    children: [{ path: '', name: 'not-found', component: () => import('@/views/NotFoundView.vue'), meta: { title: 'No encontrado' } }],
  },
]

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, saved) {
    if (saved) return saved
    // Ancla (#estadisticas): el contenido llega tras cargar los datos; se espera un momento.
    if (to.hash) return new Promise((resolve) => setTimeout(() => resolve({ el: to.hash, top: 80 }), 450))
    // Cambiar de pestaña dentro del torneo no debe saltar al inicio.
    if (to.matched[0] && to.matched[1] && to.matched[1] === from.matched[1] && to.params.id === from.params.id && to.params.teamId === from.params.teamId) return false
    return { top: 0 }
  },
})

/** Solo rutas internas: evita redirecciones abiertas (?redirect=https://evil.com o //evil.com). */
export function safeRedirect(value: unknown, fallback = '/admin'): string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : fallback
}

router.beforeEach(async (to) => {
  const needsAuth = to.matched.some((record) => record.meta.requiresAuth)
  const guestOnly = to.matched.some((record) => record.meta.guestOnly)
  if (!needsAuth && !guestOnly) return true // el área pública no toca la sesión

  const auth = useAuthStore()
  await auth.initializeAuth() // tras F5: refresh con la cookie → /auth/me

  if (needsAuth && !auth.isAuthenticated) return { name: 'login', query: { redirect: to.fullPath } }
  if (guestOnly && auth.isAuthenticated) return safeRedirect(to.query.redirect)
  return true
})

router.afterEach((to) => {
  const title = to.meta.title as string | undefined
  document.title = title ? `${title} · Kisokar` : 'Kisokar · Torneos y perfiles de fútbol'
})
