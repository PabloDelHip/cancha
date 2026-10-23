<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { AlertTriangle, ArrowRight, Ban, CalendarClock, CheckCircle2, MapPin, X } from 'lucide-vue-next'
import type { ID, RescheduleProposal, RescheduleSearch, RescheduleSelection, Venue } from '@/types'
import { getErrorBody, getErrorMessage, matchService, venueService } from '@/services'
import { useMatchesStore, useRoundsStore, useTeamsStore, useTournamentsStore } from '@/stores'
import { useToast } from '@/composables/useToast'
import { formatDate, plural, toISODate } from '@/utils/format'
import BaseModal from '@/components/common/BaseModal.vue'
import AppButton from '@/components/common/AppButton.vue'
import FormField from '@/components/common/FormField.vue'
import WeekdayPicker from '@/components/admin/scheduling/WeekdayPicker.vue'

/**
 * 6C — reprogramar parte del calendario: el organizador elige qué partidos, dice por qué y dónde
 * buscar, y ve qué cambia, qué se queda igual y qué queda sin horario antes de confirmar. El resto
 * del calendario no se toca. El servidor revalida todo al confirmar (todo o nada).
 */
const props = defineProps<{ open: boolean; tournamentId: ID; preselect?: ID[] }>()
const emit = defineEmits<{ close: []; done: [] }>()

const matches = useMatchesStore()
const rounds = useRoundsStore()
const teams = useTeamsStore()
const tournaments = useTournamentsStore()
const toast = useToast()

type Mode = 'round' | 'dates' | 'place' | 'pending' | 'pick'
const mode = ref<Mode>('round')
const form = reactive({ round: 1, from: '', to: '', place: '', picked: [] as ID[], reason: '' })
const search = reactive({ from: '', to: '', days: [] as number[], avoid: '', avoidDates: [] as string[], avoidFieldIds: [] as ID[], keepValid: true })
const venues = ref<Venue[]>([])
const proposal = ref<RescheduleProposal | null>(null)
const acceptPending = ref(false)
const busy = ref(false)

const tournament = computed(() => tournaments.get(props.tournamentId))
const canAssign = computed(() => tournaments.can(props.tournamentId, 'ASSIGNMENTS'))
/** Partidos que se pueden mover: sin resultado, ni en juego, ni cancelados. */
const movable = computed(() =>
  matches
    .ofTournament(props.tournamentId)
    .filter((m) => (m.status === 'scheduled' || m.status === 'postponed') && m.homeScore === null && !m.sheetClosed)
    .sort((a, b) => Number(!!a.pendingSchedule) - Number(!!b.pendingSchedule) || a.date.localeCompare(b.date) || a.time.localeCompare(b.time)),
)
const roundNumbers = computed(() => [...new Set(movable.value.map((m) => m.round))].sort((a, b) => a - b))
const pendingCountInTournament = computed(() => movable.value.filter((m) => m.pendingSchedule).length)
const places = computed(() => venues.value.flatMap((v) => [{ value: `v:${v.id}`, label: `${v.name} (toda la sede)` }, ...v.fields.map((f) => ({ value: `f:${f.id}`, label: `${v.name} · ${f.name}` }))]))
const fieldNames = computed(() => Object.fromEntries(venues.value.flatMap((v) => v.fields.map((f) => [f.id, `${v.name} · ${f.name}`]))))
const name = (id: ID) => proposal.value?.teams[id] ?? teams.nameOf(id)
const label = (m: { homeTeamId: ID; awayTeamId: ID }) => `${name(m.homeTeamId)} vs ${name(m.awayTeamId)}`

watch(
  () => props.open,
  (open) => {
    if (!open) return
    proposal.value = null
    acceptPending.value = false
    const today = toISODate(new Date())
    Object.assign(form, { round: roundNumbers.value[0] ?? 1, from: today, to: '', place: '', picked: [...(props.preselect ?? [])], reason: '' })
    Object.assign(search, { from: today, to: '', days: [], avoid: '', avoidDates: [], avoidFieldIds: [], keepValid: true })
    mode.value = props.preselect?.length ? 'pick' : pendingCountInTournament.value ? 'pending' : 'round'
    if (canAssign.value) venueService.forTournament(props.tournamentId).then((v) => (venues.value = v)).catch(() => (venues.value = []))
  },
)
watch([mode, form, search], () => (proposal.value = null), { deep: true })
watch(proposal, () => (acceptPending.value = false))

const selection = computed<RescheduleSelection | null>(() => {
  if (mode.value === 'round') return { round: form.round }
  if (mode.value === 'dates') return form.from ? { from: form.from, ...(form.to ? { to: form.to } : {}) } : null
  if (mode.value === 'place') return form.place ? (form.place.startsWith('v:') ? { venueId: form.place.slice(2) } : { fieldId: form.place.slice(2) }) : null
  if (mode.value === 'pending') return { pending: true }
  return form.picked.length ? { matchIds: form.picked } : null
})
const needsReason = computed(() => tournament.value?.status === 'active')
const ready = computed(() => !!selection.value && (!needsReason.value || form.reason.trim().length > 0))

function addAvoid() {
  if (search.avoid && !search.avoidDates.includes(search.avoid)) search.avoidDates = [...search.avoidDates, search.avoid].sort()
  search.avoid = ''
}

async function propose() {
  if (!selection.value) return
  busy.value = true
  try {
    const s: RescheduleSearch = {
      ...(search.from ? { from: search.from } : {}),
      ...(search.to ? { to: search.to } : {}),
      ...(search.days.length ? { days: search.days } : {}),
      ...(search.avoidDates.length ? { avoidDates: search.avoidDates } : {}),
      ...(search.avoidFieldIds.length ? { avoidFieldIds: search.avoidFieldIds } : {}),
      keepValid: search.keepValid,
    }
    proposal.value = await matchService.rescheduleProposal(props.tournamentId, selection.value, s)
  } catch (e) {
    toast.error(getErrorMessage(e))
  } finally {
    busy.value = false
  }
}

const moves = computed(() => proposal.value?.items.filter((i) => i.action === 'MOVE') ?? [])
const keeps = computed(() => proposal.value?.items.filter((i) => i.action === 'KEEP') ?? [])
const pendings = computed(() => proposal.value?.items.filter((i) => i.action === 'PENDING') ?? [])
const canConfirm = computed(() => !!proposal.value && (moves.value.length > 0 || pendings.value.length > 0) && (!pendings.value.length || acceptPending.value))
const confirmLabel = computed(() => {
  if (!proposal.value) return 'Ver propuesta'
  if (!moves.value.length && !pendings.value.length) return 'No hay cambios'
  const parts = [moves.value.length ? `Reprogramar ${plural(moves.value.length, 'partido')}` : null, pendings.value.length ? `dejar ${pendings.value.length} sin horario` : null].filter(Boolean)
  return parts.join(' y ')
})
const fieldOf = (id: ID | null) => (id ? (proposal.value?.fields[id] ?? fieldNames.value[id] ?? 'Cancha') : null)

async function submit() {
  if (!proposal.value) return propose()
  if (!canConfirm.value) return
  busy.value = true
  try {
    const result = await matchService.confirmReschedule(props.tournamentId, {
      ...(form.reason.trim() ? { reason: form.reason.trim() } : {}),
      ...(pendings.value.length ? { allowPending: pendings.value.length } : {}),
      items: proposal.value.items.map((i) => ({ matchId: i.matchId, version: i.version, action: i.action, ...(i.after ? { date: i.after.date, time: i.after.time, fieldId: i.after.fieldId } : {}) })),
    })
    matches.replaceMany(result.matches)
    toast.success([result.moved ? `${plural(result.moved, 'partido reprogramado', 'partidos reprogramados')}` : null, result.pending ? `${result.pending} sin horario` : null].filter(Boolean).join(' · ') || 'Sin cambios')
    emit('done')
    emit('close')
  } catch (e) {
    const code = getErrorBody<{ error?: string }>(e)?.error
    if (['PROPOSAL_STALE', 'SCHEDULE_CONSTRAINTS', 'FIELD_CONFLICT', 'BRACKET_ORDER', 'MATCH_NOT_RESCHEDULABLE', 'PENDING_NOT_CONFIRMED'].includes(code ?? '')) {
      proposal.value = null
      toast.error(`${getErrorMessage(e)} El calendario cambió desde la propuesta: genera una nueva.`)
    } else toast.error(getErrorMessage(e))
  } finally {
    busy.value = false
  }
}

const MODES: { value: Mode; title: string; text: string }[] = [
  { value: 'round', title: 'Una jornada', text: 'Todos sus partidos pendientes' },
  { value: 'dates', title: 'Unas fechas', text: 'P. ej. un fin de semana' },
  { value: 'place', title: 'Una cancha o sede', text: 'Sus partidos desde hoy' },
  { value: 'pending', title: 'Sin horario', text: 'Los que quedaron por programar' },
  { value: 'pick', title: 'Partidos que elijo', text: 'Uno o varios' },
]
</script>

<template>
  <BaseModal :open="open" title="Reprogramar partidos" description="Elige qué partidos mover. El resto del calendario no cambia." size="lg" @close="busy || emit('close')">
    <form id="reschedule-form" class="space-y-5" @submit.prevent="submit">
      <template v-if="!proposal">
        <fieldset>
          <legend class="mb-2 text-sm font-medium text-zinc-700">1. ¿Qué partidos?</legend>
          <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <label
              v-for="o in MODES.filter((x) => (x.value !== 'place' || places.length) && (x.value !== 'pending' || pendingCountInTournament))"
              :key="o.value"
              class="flex cursor-pointer flex-col rounded-xl border p-3 text-sm transition has-[:checked]:border-pitch-900 has-[:checked]:bg-pitch-50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-pitch-500"
            >
              <input v-model="mode" type="radio" name="rs-mode" :value="o.value" class="sr-only" />
              <span class="font-semibold">{{ o.title }}<template v-if="o.value === 'pending'"> ({{ pendingCountInTournament }})</template></span>
              <span class="text-xs text-zinc-500">{{ o.text }}</span>
            </label>
          </div>
        </fieldset>

        <FormField v-if="mode === 'round'" id="rs-round" label="Jornada">
          <select id="rs-round" v-model.number="form.round" class="input">
            <option v-for="r in roundNumbers" :key="r" :value="r">{{ rounds.labelOf(tournamentId, r) }}</option>
          </select>
        </FormField>
        <div v-else-if="mode === 'dates'" class="grid grid-cols-2 gap-4">
          <FormField id="rs-from" label="Desde"><input id="rs-from" v-model="form.from" type="date" class="input" required /></FormField>
          <FormField id="rs-to" label="Hasta" hint="Opcional"><input id="rs-to" v-model="form.to" type="date" class="input" :min="form.from" /></FormField>
        </div>
        <FormField v-else-if="mode === 'place'" id="rs-place" label="Cancha o sede">
          <select id="rs-place" v-model="form.place" class="input">
            <option value="" disabled>Elige…</option>
            <option v-for="p in places" :key="p.value" :value="p.value">{{ p.label }}</option>
          </select>
        </FormField>
        <fieldset v-else-if="mode === 'pick'">
          <legend class="mb-2 text-sm text-zinc-600">{{ plural(form.picked.length, 'partido elegido', 'partidos elegidos') }}</legend>
          <ul class="max-h-56 divide-y divide-zinc-100 overflow-y-auto rounded-xl border border-zinc-200">
            <li v-for="m in movable" :key="m.id">
              <label class="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm">
                <input v-model="form.picked" type="checkbox" :value="m.id" class="size-4 shrink-0 accent-pitch-700" />
                <span class="min-w-0 flex-1 truncate">{{ label(m) }}</span>
                <span class="tabular shrink-0 text-xs text-zinc-500">{{ m.pendingSchedule ? 'Sin fecha' : `${formatDate(m.date)} · ${m.time}` }}</span>
              </label>
            </li>
          </ul>
        </fieldset>

        <FormField id="rs-reason" :label="`2. ¿Por qué?${needsReason ? '' : ' (opcional)'}`" :hint="needsReason ? 'Queda en el historial de cada partido' : undefined">
          <input id="rs-reason" v-model="form.reason" class="input" maxlength="300" placeholder="P. ej. la cancha estará en mantenimiento" :required="needsReason" />
        </FormField>

        <fieldset class="space-y-4 rounded-xl border border-zinc-200 p-3">
          <legend class="px-1 text-sm font-medium text-zinc-700">3. ¿Dónde y cuándo buscar?</legend>
          <div class="grid grid-cols-2 gap-4">
            <FormField id="rs-s-from" label="Desde"><input id="rs-s-from" v-model="search.from" type="date" class="input" /></FormField>
            <FormField id="rs-s-to" label="Hasta" hint="Por defecto, 6 semanas"><input id="rs-s-to" v-model="search.to" type="date" class="input" :min="search.from" /></FormField>
          </div>
          <WeekdayPicker v-model="search.days" legend="Días (vacío = los del torneo)" />
          <div>
            <p class="mb-2 text-sm font-medium text-zinc-700">Fechas que no se pueden usar</p>
            <div class="flex gap-2">
              <input v-model="search.avoid" type="date" class="input" aria-label="Fecha que no se puede usar" />
              <AppButton variant="secondary" :disabled="!search.avoid" @click="addAvoid">Agregar</AppButton>
            </div>
            <ul v-if="search.avoidDates.length" class="mt-2 flex flex-wrap gap-1.5">
              <li v-for="d in search.avoidDates" :key="d" class="flex items-center gap-1 rounded-full bg-red-50 py-1 pr-1 pl-3 text-xs font-medium text-red-800">
                {{ formatDate(d) }}
                <button type="button" class="grid size-5 place-items-center rounded-full hover:bg-red-100" :aria-label="`Quitar ${formatDate(d)}`" @click="search.avoidDates = search.avoidDates.filter((x) => x !== d)"><X class="size-3" aria-hidden="true" /></button>
              </li>
            </ul>
          </div>
          <fieldset v-if="Object.keys(fieldNames).length">
            <legend class="mb-2 text-sm font-medium text-zinc-700">Canchas que no se pueden usar</legend>
            <div class="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              <label v-for="(n, id) in fieldNames" :key="id" class="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm has-[:checked]:border-red-500 has-[:checked]:bg-red-50">
                <input v-model="search.avoidFieldIds" type="checkbox" :value="id" class="size-4 accent-red-600" />
                <span class="min-w-0 truncate">{{ n }}</span>
              </label>
            </div>
          </fieldset>
          <label class="flex cursor-pointer items-start gap-2 text-sm">
            <input v-model="search.keepValid" type="checkbox" class="mt-0.5 size-4 accent-pitch-700" />
            <span><span class="font-medium text-zinc-900">Dejar igual los que ya están bien</span><span class="block text-xs text-zinc-500">Solo se mueven los que ya no cumplen (o caen en una fecha o cancha que no se puede usar).</span></span>
          </label>
        </fieldset>
      </template>

      <template v-else>
        <div class="flex flex-wrap gap-2 text-sm" role="status">
          <span class="rounded-full bg-pitch-50 px-3 py-1 font-semibold text-pitch-900">{{ plural(moves.length, 'cambia', 'cambian') }}</span>
          <span class="rounded-full bg-zinc-100 px-3 py-1 font-medium text-zinc-700">{{ plural(keeps.length, 'se queda igual', 'se quedan igual') }}</span>
          <span v-if="pendings.length" class="rounded-full bg-red-50 px-3 py-1 font-semibold text-red-800">{{ pendings.length }} sin horario</span>
          <span v-if="proposal.excluded.length" class="rounded-full bg-zinc-100 px-3 py-1 text-zinc-600">{{ proposal.excluded.length }} no se pueden mover</span>
        </div>

        <section v-if="moves.length" aria-labelledby="rs-moves">
          <h3 id="rs-moves" class="mb-1 text-xs font-semibold tracking-wide text-zinc-500 uppercase">Cambian</h3>
          <ul class="divide-y divide-zinc-100 rounded-xl border border-zinc-200 text-sm">
            <li v-for="i in moves" :key="i.matchId" class="px-3 py-2">
              <p class="font-medium text-zinc-900">{{ label(i) }} <span class="text-xs font-normal text-zinc-500">· {{ rounds.labelOf(tournamentId, i.round) }}</span></p>
              <p class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-zinc-600">
                <span class="text-zinc-400 line-through">{{ i.before.pendingSchedule ? 'Sin fecha' : `${formatDate(i.before.date)} · ${i.before.time}` }}<template v-if="i.before.fieldId"> · {{ fieldOf(i.before.fieldId) }}</template></span>
                <ArrowRight class="size-3.5 shrink-0 text-pitch-700" aria-hidden="true" />
                <span class="font-semibold text-pitch-900">{{ formatDate(i.after!.date) }} · {{ i.after!.time }}</span>
                <span v-if="i.after!.fieldId" class="flex items-center gap-1 text-xs"><MapPin class="size-3" aria-hidden="true" />{{ fieldOf(i.after!.fieldId) }}</span>
              </p>
              <p v-for="(w, k) in i.warnings" :key="k" class="mt-1 flex items-start gap-1.5 text-xs text-amber-800"><AlertTriangle class="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /> {{ w.message }}</p>
            </li>
          </ul>
        </section>

        <section v-if="pendings.length" class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm" role="alert" aria-labelledby="rs-pending">
          <h3 id="rs-pending" class="mb-1 font-semibold text-red-900">Sin horario posible</h3>
          <ul class="divide-y divide-red-100">
            <li v-for="i in pendings" :key="i.matchId" class="py-2 first:pt-0 last:pb-0">
              <p class="font-medium text-zinc-900">{{ label(i) }}</p>
              <p v-for="(r, k) in i.reasons.slice(0, 2)" :key="k" class="mt-0.5 flex items-start gap-1.5 text-red-700"><Ban class="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /> {{ r.message }}</p>
            </li>
          </ul>
          <label class="mt-3 flex cursor-pointer items-start gap-2 text-amber-900">
            <input v-model="acceptPending" type="checkbox" class="mt-0.5 size-4 accent-amber-600" />
            <span><strong>Guardar igual y dejar {{ plural(pendings.length, 'partido', 'partidos') }} sin horario.</strong> Los que tenían fecha quedan pospuestos; no se inventa un horario.</span>
          </label>
        </section>

        <details v-if="keeps.length" class="rounded-xl border border-zinc-200 text-sm">
          <summary class="flex cursor-pointer items-center gap-2 px-3 py-2 font-medium text-zinc-700"><CheckCircle2 class="size-4 text-pitch-700" aria-hidden="true" /> {{ plural(keeps.length, 'partido se queda igual', 'partidos se quedan igual') }}</summary>
          <ul class="divide-y divide-zinc-100 border-t border-zinc-100">
            <li v-for="i in keeps" :key="i.matchId" class="flex flex-wrap justify-between gap-x-3 px-3 py-1.5">
              <span class="min-w-0">{{ label(i) }}</span><span class="tabular text-zinc-500">{{ formatDate(i.before.date) }} · {{ i.before.time }}</span>
            </li>
          </ul>
        </details>

        <details v-if="proposal.excluded.length" class="rounded-xl border border-zinc-200 text-sm">
          <summary class="cursor-pointer px-3 py-2 font-medium text-zinc-700">{{ plural(proposal.excluded.length, 'partido no se puede mover', 'partidos no se pueden mover') }}</summary>
          <ul class="divide-y divide-zinc-100 border-t border-zinc-100">
            <li v-for="e in proposal.excluded" :key="e.matchId" class="px-3 py-1.5"><span class="font-medium">{{ label(e) }}</span> <span class="text-zinc-500">— {{ e.reason }}</span></li>
          </ul>
        </details>

        <p v-if="!moves.length && !pendings.length" class="flex items-center gap-2 rounded-xl bg-pitch-50 p-3 text-sm text-pitch-900"><CheckCircle2 class="size-4" aria-hidden="true" /> Todos los partidos elegidos ya cumplen: no hace falta cambiar nada.</p>
        <p v-if="proposal.metrics.truncated" class="text-sm text-amber-800">La búsqueda llegó a su límite: elige menos partidos o un periodo más corto.</p>
      </template>
    </form>

    <template #footer>
      <AppButton variant="secondary" :disabled="busy" @click="emit('close')">Cancelar</AppButton>
      <AppButton v-if="proposal" variant="secondary" :disabled="busy" @click="proposal = null">Ajustar</AppButton>
      <AppButton type="submit" form="reschedule-form" :loading="busy" :disabled="proposal ? !canConfirm : !ready">
        <CalendarClock v-if="!proposal" class="size-4" aria-hidden="true" /> {{ confirmLabel }}
      </AppButton>
    </template>
  </BaseModal>
</template>
