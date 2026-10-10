<script setup lang="ts">
import { useImageAfterCreate } from '@/composables/useImageAfterCreate'
import { teamService } from '@/services'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import posthog from 'posthog-js'
import { analyticsEnabled as posthogConfigured } from '@/services/analytics'
import { ArrowLeft, CalendarDays, Check, CheckCircle2, Clock, Crown, LinkIcon, MapPin, Plus, Server, ShieldPlus, UserCog, UserPlus, Users, XCircle } from 'lucide-vue-next'
import type { ID, MyRegistrationTeam, PublicRegistration, RosterPeriod, TeamInput } from '@/types'
import { getErrorMessage, getErrorStatus, REGISTRATION_REQUIRES_SERVER, registrationService, teamManagementService, USE_MOCKS } from '@/services'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import { usePageTitle } from '@/composables/usePageTitle'
import { MODALITY_LABELS, playersRange, POSITION_LABELS, REGISTRATION_CLOSED } from '@/utils/labels'
import { formatDate, formatDateRange, plural, toISODate } from '@/utils/format'
import { fullName } from '@/utils/players'
import AppButton from '@/components/common/AppButton.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import TeamLogo from '@/components/teams/TeamLogo.vue'
import TeamForm from '@/components/teams/TeamForm.vue'
import PlayerAvatar from '@/components/players/PlayerAvatar.vue'
import AddRosterPlayerDialog from '@/components/admin/team/AddRosterPlayerDialog.vue'

/**
 * Enlace privado de inscripción (se comparte por WhatsApp). Pensado para el teléfono:
 * portada del torneo → sesión → elegir uno de MIS equipos (propietario o delegado) → elegir
 * jugadores de su plantilla GLOBAL → revisar → enviar → estado. El enlace solo da acceso al flujo;
 * el servidor comprueba que administres el equipo y revalida todo al aprobar.
 */
const props = defineProps<{ token: string }>()
const auth = useAuthStore()
const attachImage = useImageAfterCreate()
const route = useRoute()
const toast = useToast()
const { confirm } = useConfirm()

type Step = 'landing' | 'team' | 'create' | 'players' | 'review' | 'status'
const state = ref<'loading' | 'invalid' | 'error' | 'ready'>('loading')
const errorMessage = ref('')
const info = ref<PublicRegistration | null>(null)
const teams = ref<MyRegistrationTeam[]>([])
const step = ref<Step>('landing')
const selectedId = ref<ID | null>(null)
const roster = ref<RosterPeriod[]>([])
const rosterLoading = ref(false)
const picked = ref<Set<ID>>(new Set())
const busy = ref(false)
const addingPlayer = ref(false)
usePageTitle(() => (info.value ? `Inscripción · ${info.value.tournament.name}` : 'Inscribir equipo'))

const reg = computed(() => info.value?.registration)
const selected = computed(() => teams.value.find((t) => t.team.id === selectedId.value) ?? null)
const latest = computed(() => selected.value?.requests[0] ?? null)
const loginTo = computed(() => ({ name: 'login', query: { redirect: route.fullPath } }))
const registerTo = computed(() => ({ name: 'register', query: { redirect: route.fullPath } }))
const range = computed(() => (reg.value ? playersRange(reg.value.minPlayers, reg.value.maxPlayers) : null))

async function loadTeams() {
  teams.value = await registrationService.myTeams(props.token)
}

onMounted(async () => {
  if (USE_MOCKS) return
  try {
    // Las rutas públicas no restauran la sesión por sí solas: aquí sí hace falta saber quién es.
    await auth.initializeAuth()
    info.value = await registrationService.resolve(props.token)
    if (auth.isAuthenticated) {
      await loadTeams()
      step.value = 'team' // p. ej. al volver del login: directo a elegir equipo
      await restoreDraft() // si la dejó a medias: exactamente donde iba
    }
    state.value = 'ready'
  } catch (e) {
    state.value = getErrorStatus(e) === 404 ? 'invalid' : 'error'
    errorMessage.value = getErrorMessage(e)
  }
})

// ─── Inscripción a medias: se guarda en el servidor mientras se avanza ──────

const restored = ref(false)
let restoring = false
let saveTimer: ReturnType<typeof setTimeout> | null = null
let saving: Promise<unknown> | null = null

/** Retoma el borrador: equipo, jugadores marcados (los que siguen en la plantilla) y paso. */
async function restoreDraft() {
  const draft = await registrationService.getDraft(props.token).catch(() => null)
  const t = draft?.teamId ? teams.value.find((x) => x.team.id === draft.teamId) : null
  if (!draft || !t || t.enrolled || t.requests[0]?.status === 'pending' || !reg.value?.open) return
  restoring = true
  try {
    selectedId.value = t.team.id
    step.value = 'players'
    await loadRoster()
    const inRoster = new Set(roster.value.map((r) => r.player.id))
    picked.value = new Set(draft.playerIds.filter((id) => inRoster.has(id)))
    if (draft.step === 'review' && !limitError.value) step.value = 'review'
    restored.value = true
  } finally {
    restoring = false
  }
}

function flushDraft() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = null
  if (!selectedId.value || (step.value !== 'players' && step.value !== 'review')) return
  const body = { teamId: selectedId.value, playerIds: [...picked.value], step: step.value }
  // Guardar el progreso nunca bloquea ni molesta: si falla, el flujo sigue igual.
  saving = registrationService.saveDraft(props.token, body).catch(() => null)
}
watch([step, selectedId, picked], () => {
  if (restoring || USE_MOCKS || state.value !== 'ready' || !auth.isAuthenticated || !reg.value?.open) return
  if (!selectedId.value || (step.value !== 'players' && step.value !== 'review')) return
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(flushDraft, 500)
})
// Al salir de la página no se pierde el último cambio.
onBeforeUnmount(() => saveTimer && flushDraft())

/** Cancelar la inscripción a medias: solo descarta el borrador (equipo y jugadores se conservan). */
async function discardDraft() {
  const ok = await confirm({
    title: '¿Cancelar esta inscripción?',
    message: 'Se descarta lo que llevabas. Tu equipo, su plantilla y los jugadores que registraste se conservan.',
    confirmLabel: 'Cancelar inscripción',
    cancelLabel: 'Volver',
    tone: 'danger',
  })
  if (!ok) return
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = null
  busy.value = true
  try {
    await saving
    await registrationService.deleteDraft(props.token)
    restoring = true
    picked.value = new Set()
    selectedId.value = null
    step.value = 'team'
    restored.value = false
    toast.success('Inscripción cancelada.')
  } catch (e) {
    toast.error(getErrorMessage(e))
  } finally {
    restoring = false
    busy.value = false
  }
}

/** Estado del equipo en este torneo, en palabras. */
function teamStatus(t: MyRegistrationTeam) {
  if (t.enrolled) return { label: 'Inscrito', cls: 'bg-pitch-100 text-pitch-900' }
  const r = t.requests[0]
  if (r?.status === 'pending') return { label: 'Pendiente', cls: 'bg-amber-100 text-amber-900' }
  if (r?.status === 'rejected') return { label: 'Rechazada', cls: 'bg-red-100 text-red-800' }
  return null
}

async function chooseTeam(t: MyRegistrationTeam) {
  selectedId.value = t.team.id
  if (t.enrolled || t.requests[0]?.status === 'pending' || t.requests[0]?.status === 'rejected' || !reg.value?.open) {
    step.value = 'status'
    return
  }
  await openPlayers()
}

async function openPlayers() {
  step.value = 'players'
  picked.value = new Set()
  await loadRoster()
}
async function loadRoster() {
  if (!selectedId.value) return
  rosterLoading.value = true
  try {
    roster.value = await teamManagementService.roster(selectedId.value, 'active')
  } catch (e) {
    toast.error(getErrorMessage(e))
  } finally {
    rosterLoading.value = false
  }
}
function toggle(id: ID) {
  const next = new Set(picked.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  picked.value = next
}
const allPicked = computed(() => roster.value.length > 0 && roster.value.every((r) => picked.value.has(r.player.id)))
function toggleAll() {
  picked.value = allPicked.value ? new Set() : new Set(roster.value.map((r) => r.player.id))
}
const count = computed(() => picked.value.size)
const limitError = computed(() => {
  const r = reg.value
  if (!count.value) return 'Selecciona al menos un jugador.'
  if (r?.minPlayers && count.value < r.minPlayers) return `Faltan ${r.minPlayers - count.value} para el mínimo de ${r.minPlayers}.`
  if (r?.maxPlayers && count.value > r.maxPlayers) return `Te pasaste por ${count.value - r.maxPlayers}: el máximo es ${r.maxPlayers}.`
  return null
})
const pickedPlayers = computed(() => roster.value.filter((r) => picked.value.has(r.player.id)))

async function onPlayerAdded(player: { id: ID }) {
  await loadRoster()
  picked.value = new Set(picked.value).add(player.id)
}

async function send() {
  if (!selectedId.value) return
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = null
  busy.value = true
  try {
    await saving // un guardado en curso termina antes del envío (el envío borra el borrador)
    await registrationService.submit(props.token, selectedId.value, [...picked.value])
    restored.value = false
    if (posthogConfigured && info.value) {
      posthog.capture('registration_request_submitted', {
        tournament_id: info.value.tournament.id,
        player_count: picked.value.size,
      })
    }
    await loadTeams()
    step.value = 'status'
    toast.success('Solicitud enviada.')
  } catch (e) {
    toast.error(getErrorMessage(e))
  } finally {
    busy.value = false
  }
}

async function cancelRequest() {
  const r = latest.value
  if (!r) return
  const ok = await confirm({ title: '¿Cancelar la solicitud?', message: 'El organizador ya no la verá como pendiente. Podrás enviar otra mientras las inscripciones sigan abiertas.', confirmLabel: 'Cancelar solicitud', cancelLabel: 'Volver', tone: 'danger' })
  if (!ok) return
  busy.value = true
  try {
    await registrationService.cancel(props.token, r.id)
    if (posthogConfigured && info.value) {
      posthog.capture('registration_request_cancelled', {
        tournament_id: info.value.tournament.id,
      })
    }
    await loadTeams()
    toast.success('Solicitud cancelada.')
  } catch (e) {
    toast.error(getErrorMessage(e))
  } finally {
    busy.value = false
  }
}

async function createTeam(input: TeamInput, logo: Blob | null) {
  busy.value = true
  try {
    const created = await registrationService.createTeam(props.token, input)
    // Ya es su propietario: puede subir el logo a Cloudinary.
    const withLogo = await attachImage(logo, (image) => teamService.uploadLogo(created.team.id, image))
    if (withLogo) created.team = withLogo
    teams.value = [...teams.value, created]
    selectedId.value = created.team.id
    toast.success(`${created.team.name} creado. Ahora eres su propietario.`)
    await openPlayers()
  } catch (e) {
    toast.error(getErrorMessage(e))
  } finally {
    busy.value = false
  }
}

async function refresh() {
  busy.value = true
  try {
    info.value = await registrationService.resolve(props.token)
    await loadTeams()
  } catch (e) {
    toast.error(getErrorMessage(e))
  } finally {
    busy.value = false
  }
}

const when = (iso: string | null) => (iso ? formatDate(toISODate(new Date(iso))) : '')
const back = () => (step.value = step.value === 'review' ? 'players' : step.value === 'landing' ? 'landing' : step.value === 'players' || step.value === 'status' || step.value === 'create' ? 'team' : 'landing')
</script>

<template>
  <div class="mx-auto max-w-xl px-4 pt-6 pb-28 sm:px-6">
    <EmptyState v-if="USE_MOCKS" :icon="Server" title="Requiere el servidor" :description="`${REGISTRATION_REQUIRES_SERVER}.`" class="card" />
    <LoadingState v-else-if="state === 'loading'" />
    <EmptyState
      v-else-if="state === 'invalid'"
      :icon="LinkIcon"
      title="Este enlace no está disponible"
      description="Puede que el organizador lo haya cambiado o desactivado. Pídele el enlace actualizado."
      class="card"
    />
    <EmptyState v-else-if="state === 'error'" :icon="LinkIcon" title="No se pudo abrir el enlace" :description="errorMessage" class="card" />

    <template v-else-if="info && reg">
      <!-- Cabecera del torneo (siempre visible) -->
      <header class="relative overflow-hidden rounded-3xl bg-pitch-950 p-5 text-white">
        <div class="pointer-events-none absolute -top-10 -right-10 size-40 rounded-full bg-lime-400/15 blur-2xl" aria-hidden="true" />
        <p class="relative text-xs font-semibold tracking-wider text-lime-400 uppercase">Inscripción de equipos</p>
        <h1 class="display relative mt-1 text-3xl leading-none break-words">{{ info.tournament.name }}</h1>
        <p class="relative mt-2 text-sm text-pitch-200">{{ MODALITY_LABELS[info.tournament.modality] }} · {{ info.tournament.category }}</p>
        <ul class="relative mt-3 space-y-1 text-sm text-pitch-100">
          <li class="flex items-center gap-2"><CalendarDays class="size-4 shrink-0 text-pitch-300" aria-hidden="true" /> {{ formatDateRange(info.tournament.startDate, info.tournament.endDate) }}</li>
          <li v-if="info.tournament.venue" class="flex items-center gap-2"><MapPin class="size-4 shrink-0 text-pitch-300" aria-hidden="true" /> {{ info.tournament.venue }}</li>
        </ul>
        <div class="relative mt-4 flex flex-wrap gap-2 text-xs font-semibold">
          <span class="rounded-full px-2.5 py-1" :class="reg.open ? 'bg-lime-400 text-pitch-950' : 'bg-white/10 text-pitch-100'">
            {{ reg.open ? 'Inscripciones abiertas' : REGISTRATION_CLOSED[reg.closedReason ?? 'disabled'] }}
          </span>
          <span v-if="range" class="rounded-full bg-white/10 px-2.5 py-1">{{ range }}</span>
          <span v-if="reg.deadline" class="rounded-full bg-white/10 px-2.5 py-1">Cierre: {{ formatDate(reg.deadline) }}</span>
          <span v-if="reg.spotsLeft !== null" class="rounded-full bg-white/10 px-2.5 py-1">{{ plural(reg.spotsLeft, 'lugar disponible', 'lugares disponibles') }}</span>
        </div>
      </header>

      <div v-if="step !== 'landing' && step !== 'team'" class="mt-4 flex items-center justify-between gap-3">
        <button type="button" class="inline-flex items-center gap-1 text-sm font-semibold text-zinc-600 hover:text-zinc-900" @click="back">
          <ArrowLeft class="size-4" aria-hidden="true" /> Atrás
        </button>
        <button v-if="step === 'players' || step === 'review'" type="button" class="text-sm font-semibold text-red-700 hover:text-red-800" :disabled="busy" @click="discardDraft">
          Cancelar inscripción
        </button>
      </div>
      <p v-if="restored && (step === 'players' || step === 'review')" class="mt-3 rounded-xl bg-pitch-50 px-3 py-2 text-sm text-pitch-900" role="status">
        Retomamos tu inscripción donde la dejaste. Tu progreso se guarda solo.
      </p>

      <!-- Portada -->
      <section v-if="step === 'landing'" class="mt-6 space-y-3">
        <template v-if="!auth.isAuthenticated">
          <p class="text-sm text-zinc-600">Para inscribir a tu equipo inicia sesión. Si aún no tienes cuenta, créala: es una sola cuenta para todo en Kisokar.</p>
          <AppButton :to="loginTo" class="h-12 w-full text-base"><ShieldPlus class="size-5" aria-hidden="true" /> Inscribir mi equipo</AppButton>
          <AppButton :to="registerTo" variant="secondary" class="h-12 w-full text-base">Crear cuenta</AppButton>
        </template>
        <template v-else>
          <p class="text-sm text-zinc-600">Hola, {{ auth.user?.firstName }}. Elige con qué equipo quieres participar{{ reg.open ? '' : ' o consulta el estado de tu solicitud' }}.</p>
          <AppButton class="h-12 w-full text-base" @click="step = 'team'"><ShieldPlus class="size-5" aria-hidden="true" /> {{ reg.open ? 'Inscribir mi equipo' : 'Ver mis solicitudes' }}</AppButton>
        </template>
      </section>

      <!-- Elegir equipo -->
      <section v-else-if="step === 'team'" aria-labelledby="team-step" class="mt-6">
        <h2 id="team-step" class="text-lg font-bold">¿Con qué equipo quieres participar?</h2>
        <p class="mb-3 text-sm text-zinc-500">Solo aparecen los equipos que administras como propietario o delegado.</p>
        <ul v-if="teams.length" class="space-y-2">
          <li v-for="t in teams" :key="t.team.id">
            <button type="button" class="card flex w-full items-center gap-3 p-3 text-left transition hover:border-pitch-300" @click="chooseTeam(t)">
              <TeamLogo :team="t.team" size="lg" class="shrink-0" />
              <span class="min-w-0 flex-1">
                <span class="block truncate font-semibold text-zinc-950">{{ t.team.name }}</span>
                <span class="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-zinc-600">
                  <span class="inline-flex items-center gap-1"><component :is="t.myRole === 'owner' ? Crown : UserCog" class="size-3.5" aria-hidden="true" />{{ t.myRole === 'owner' ? 'Propietario' : 'Delegado' }}</span>
                  <span class="inline-flex items-center gap-1"><Users class="size-3.5" aria-hidden="true" />{{ plural(t.rosterSize, 'jugador', 'jugadores') }}</span>
                </span>
              </span>
              <span v-if="teamStatus(t)" class="shrink-0 rounded-full px-2 py-0.5 text-xs font-bold" :class="teamStatus(t)!.cls">{{ teamStatus(t)!.label }}</span>
            </button>
          </li>
        </ul>
        <div v-else class="card px-4 py-5 text-center text-sm text-zinc-600">
          <p class="font-semibold text-zinc-900">Necesitas administrar un equipo para inscribirlo.</p>
          <p class="mt-1">Si tu equipo aún no existe en Kisokar, créalo: quedarás como su propietario.</p>
        </div>
        <AppButton v-if="reg.open" variant="secondary" class="mt-3 h-12 w-full" @click="step = 'create'"><Plus class="size-4" aria-hidden="true" /> Crear equipo</AppButton>
      </section>

      <!-- Crear equipo -->
      <section v-else-if="step === 'create'" aria-labelledby="create-step" class="mt-4">
        <h2 id="create-step" class="text-lg font-bold">Crear equipo</h2>
        <p class="mb-3 text-sm text-zinc-500">Quedarás como su propietario. Si tu equipo ya existe en Kisokar, pídele a su propietario que te agregue como delegado en lugar de crear otro.</p>
        <div class="card p-4">
          <TeamForm form-id="join-new-team" :initial="null" @submit="createTeam" />
        </div>
        <AppButton type="submit" form="join-new-team" :loading="busy" class="mt-3 h-12 w-full text-base">Crear y continuar</AppButton>
      </section>

      <!-- Elegir jugadores -->
      <section v-else-if="step === 'players' && selected" aria-labelledby="players-step" class="mt-4">
        <div class="mb-3 flex items-center gap-3">
          <TeamLogo :team="selected.team" size="md" class="shrink-0" />
          <div class="min-w-0">
            <h2 id="players-step" class="truncate text-lg font-bold">Plantilla para {{ info.tournament.name }}</h2>
            <p class="truncate text-sm text-zinc-500">{{ selected.team.name }} · de su plantilla actual</p>
          </div>
        </div>
        <LoadingState v-if="rosterLoading" />
        <template v-else>
          <div v-if="roster.length" class="mb-2 flex items-center justify-between">
            <button type="button" class="text-sm font-semibold text-pitch-700" @click="toggleAll">{{ allPicked ? 'Quitar todos' : 'Seleccionar todos' }}</button>
            <span class="text-sm text-zinc-500">{{ range ?? 'Sin límite de jugadores' }}</span>
          </div>
          <ul v-if="roster.length" class="card divide-y divide-zinc-100 overflow-hidden">
            <li v-for="r in roster" :key="r.periodId">
              <label class="flex min-h-14 cursor-pointer items-center gap-3 px-4 py-2.5" :class="picked.has(r.player.id) && 'bg-pitch-50/60'">
                <input type="checkbox" :checked="picked.has(r.player.id)" class="size-5 shrink-0 accent-pitch-700" @change="toggle(r.player.id)" />
                <PlayerAvatar :player="r.player" size="sm" decorative />
                <span class="min-w-0 flex-1">
                  <span class="block truncate font-semibold text-zinc-900">{{ fullName(r.player) }}</span>
                  <span class="block text-xs text-zinc-500">{{ POSITION_LABELS[r.player.position] }}</span>
                </span>
              </label>
            </li>
          </ul>
          <p v-else class="card px-4 py-5 text-center text-sm text-zinc-600">La plantilla de {{ selected.team.name }} está vacía. Agrega a tus jugadores para inscribirlos.</p>
          <AppButton variant="secondary" class="mt-3 h-11 w-full" @click="addingPlayer = true"><UserPlus class="size-4" aria-hidden="true" /> Agregar jugador a la plantilla</AppButton>
        </template>

        <!-- Barra fija: contador y continuar -->
        <div class="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
          <div class="mx-auto flex max-w-xl items-center gap-3">
            <p class="min-w-0 flex-1 text-sm" aria-live="polite">
              <strong class="tabular text-zinc-950">{{ plural(count, 'seleccionado', 'seleccionados') }}</strong>
              <span v-if="limitError" class="block truncate text-xs text-amber-700">{{ limitError }}</span>
            </p>
            <AppButton class="h-12 shrink-0" :disabled="!!limitError" @click="step = 'review'">Revisar</AppButton>
          </div>
        </div>
      </section>

      <!-- Revisar y enviar -->
      <section v-else-if="step === 'review' && selected" aria-labelledby="review-step" class="mt-4">
        <h2 id="review-step" class="text-lg font-bold">Revisa y envía</h2>
        <div class="card mt-3 p-4">
          <div class="flex items-center gap-3">
            <TeamLogo :team="selected.team" size="md" class="shrink-0" />
            <div class="min-w-0">
              <p class="truncate font-semibold text-zinc-950">{{ selected.team.name }}</p>
              <p class="text-sm text-zinc-500">{{ plural(count, 'jugador', 'jugadores') }} · {{ info.tournament.name }}</p>
            </div>
          </div>
          <ol class="mt-3 space-y-1 border-t border-zinc-100 pt-3 text-sm">
            <li v-for="(r, i) in pickedPlayers" :key="r.player.id" class="flex gap-2">
              <span class="tabular w-5 text-right text-zinc-400">{{ i + 1 }}.</span><span class="truncate">{{ fullName(r.player) }}</span>
            </li>
          </ol>
        </div>
        <p class="mt-3 text-sm text-zinc-500">El organizador revisará la solicitud. Los dorsales se asignan después, dentro del torneo.</p>
        <AppButton :loading="busy" class="mt-3 h-12 w-full text-base" @click="send"><Check class="size-5" aria-hidden="true" /> Enviar solicitud</AppButton>
      </section>

      <!-- Estado -->
      <section v-else-if="step === 'status' && selected" aria-labelledby="status-step" class="mt-4">
        <div class="card p-5 text-center">
          <TeamLogo :team="selected.team" size="lg" class="mx-auto" />
          <p class="mt-2 font-semibold text-zinc-950">{{ selected.team.name }}</p>
          <template v-if="selected.enrolled">
            <CheckCircle2 class="mx-auto mt-3 size-10 text-pitch-600" aria-hidden="true" />
            <h2 id="status-step" class="mt-1 text-lg font-bold">Inscripción aprobada</h2>
            <p class="text-sm text-zinc-600">
              <template v-if="latest?.status === 'approved'">{{ plural(latest.playerCount, 'jugador', 'jugadores') }} · </template>Ya participa en {{ info.tournament.name }}.
            </p>
            <AppButton variant="secondary" :to="{ name: 'tournament', params: { id: info.tournament.id } }" class="mt-4 w-full">Ver el torneo</AppButton>
          </template>
          <template v-else-if="latest?.status === 'pending'">
            <Clock class="mx-auto mt-3 size-10 text-amber-500" aria-hidden="true" />
            <h2 id="status-step" class="mt-1 text-lg font-bold">Solicitud enviada</h2>
            <p class="text-sm text-zinc-600">{{ plural(latest.playerCount, 'jugador', 'jugadores') }} · enviada el {{ when(latest.submittedAt) }}</p>
            <p class="mt-2 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">Pendiente · esperando revisión del organizador</p>
            <div class="mt-4 grid gap-2">
              <AppButton variant="secondary" :loading="busy" @click="refresh">Actualizar estado</AppButton>
              <AppButton variant="ghost" class="text-red-700" :disabled="busy" @click="cancelRequest">Cancelar solicitud</AppButton>
            </div>
          </template>
          <template v-else-if="latest?.status === 'rejected'">
            <XCircle class="mx-auto mt-3 size-10 text-red-500" aria-hidden="true" />
            <h2 id="status-step" class="mt-1 text-lg font-bold">Solicitud rechazada</h2>
            <p v-if="latest.rejectionReason" class="mt-1 rounded-xl bg-zinc-50 px-3 py-2 text-sm text-zinc-700">{{ latest.rejectionReason }}</p>
            <AppButton v-if="reg.open" class="mt-4 w-full" @click="openPlayers">Enviar nueva solicitud</AppButton>
          </template>
          <template v-else>
            <h2 id="status-step" class="mt-3 text-lg font-bold">{{ latest?.status === 'cancelled' ? 'Solicitud cancelada' : 'Sin solicitud' }}</h2>
            <p v-if="!reg.open" class="text-sm text-zinc-600">{{ REGISTRATION_CLOSED[reg.closedReason ?? 'disabled'] }}.</p>
            <AppButton v-else class="mt-4 w-full" @click="openPlayers">Elegir jugadores</AppButton>
          </template>
        </div>
        <details v-if="selected.requests.length > 1" class="mt-4 text-sm text-zinc-600">
          <summary class="cursor-pointer font-semibold">Historial de solicitudes</summary>
          <ul class="mt-2 space-y-1">
            <li v-for="r in selected.requests" :key="r.id">{{ when(r.submittedAt) }} · {{ plural(r.playerCount, 'jugador', 'jugadores') }} · {{ { pending: 'Pendiente', approved: 'Aprobada', rejected: 'Rechazada', cancelled: 'Cancelada' }[r.status] }}</li>
          </ul>
        </details>
      </section>
    </template>

    <AddRosterPlayerDialog
      v-if="selected"
      :open="addingPlayer"
      :team-id="selected.team.id"
      :team-name="selected.team.name"
      :active-ids="new Set(roster.map((r) => r.player.id))"
      @close="addingPlayer = false"
      @added="onPlayerAdded"
    />
  </div>
</template>
