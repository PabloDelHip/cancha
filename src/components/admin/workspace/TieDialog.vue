<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { ID, Team, TournamentStructure } from '@/types'
import { getErrorMessage, tournamentService } from '@/services'
import { toISODate } from '@/utils/format'
import BaseModal from '@/components/common/BaseModal.vue'
import AppButton from '@/components/common/AppButton.vue'
import FormField from '@/components/common/FormField.vue'

type KnockoutPhase = Extract<TournamentStructure['phases'][number], { type: 'knockout' }>

/**
 * Agregar un cruce a un cuadro armado a mano: el organizador elige los dos equipos (los ganadores de
 * la ronda anterior aparecen primero, pero puede elegir a cualquier inscrito) y la fecha de cada
 * partido. Quién pasa y el campeón salen de los resultados.
 */
const props = defineProps<{ open: boolean; tournamentId: ID; phase: KnockoutPhase; round: number; teams: Team[]; defaultVenue?: string | null }>()
const emit = defineEmits<{ close: []; done: [structure: TournamentStructure] }>()

const form = reactive({ home: '' as ID, away: '' as ID, legs: [] as { date: string; time: string; venue: string }[] })
const saving = ref(false)
const error = ref<string | null>(null)

const roundInfo = computed(() => props.phase.rounds[props.round])
/** Equipos que ya tienen cruce en esta ronda. */
const busy = computed(() => new Set((roundInfo.value?.ties ?? []).flatMap((t) => [t.homeTeamId, t.awayTeamId]).filter((x): x is ID => !!x)))
/** Ganadores de la ronda anterior (sugeridos). */
const winners = computed(() => new Set((props.phase.rounds[props.round - 1]?.ties ?? []).map((t) => t.winnerTeamId).filter((x): x is ID => !!x)))
/** Siembra de cada equipo en esta fase (cuadros con clasificados; vacío si se armó a mano). */
const seedOf = (id: ID) => props.phase.seeds.find((s) => s.teamId === id)?.seed ?? null
const bySeed = (a: Team, b: Team) => (seedOf(a.id) ?? 999) - (seedOf(b.id) ?? 999)
const options = computed(() => {
  const free = props.teams.filter((t) => !busy.value.has(t.id))
  return {
    // Ganadores de la ronda anterior por siembra: el primero es el mejor que sigue vivo.
    suggested: free.filter((t) => winners.value.has(t.id)).sort(bySeed),
    others: free.filter((t) => !winners.value.has(t.id)),
  }
})
const label = (t: Team) => (seedOf(t.id) ? `${seedOf(t.id)} · ${t.name}` : t.name)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    error.value = null
    const date = toISODate(new Date())
    // Reacomodo sugerido: el mejor sembrado que sigue vivo (local) contra el peor. Se puede cambiar.
    const s = options.value.suggested
    const [a, b] = s.length >= 2 ? [s[0], s[s.length - 1]] : [...s, ...options.value.others]
    form.home = a?.id ?? ''
    form.away = b?.id ?? ''
    form.legs = Array.from({ length: props.phase.legs }, () => ({ date, time: '18:00', venue: props.defaultVenue ?? '' }))
  },
  { immediate: true }, // se monta ya abierto
)

const sameTeam = computed(() => !!form.home && form.home === form.away)
const canSubmit = computed(() => !!form.home && !!form.away && !sameTeam.value && form.legs.every((l) => l.date && l.time))

async function submit() {
  if (!canSubmit.value) return
  saving.value = true
  error.value = null
  try {
    const structure = await tournamentService.createTie(props.tournamentId, props.phase.index, {
      round: props.round,
      homeTeamId: form.home,
      awayTeamId: form.away,
      legs: form.legs.map((l) => ({ date: l.date, time: l.time, venue: l.venue.trim() || null })),
    })
    emit('done', structure)
  } catch (e) {
    error.value = getErrorMessage(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <BaseModal :open="open" :title="`Agregar cruce · ${roundInfo?.name ?? ''}`" description="Elige los equipos y cuándo se juega." @close="saving || emit('close')">
    <form id="tie-form" class="space-y-4" @submit.prevent="submit">
      <div class="grid gap-3 sm:grid-cols-2">
        <FormField v-for="side in (['home', 'away'] as const)" :id="`tie-${side}`" :key="side" :label="side === 'home' ? (phase.legs === 2 ? 'Local en la ida' : 'Local') : (phase.legs === 2 ? 'Visitante en la ida' : 'Visitante')" required>
          <select :id="`tie-${side}`" v-model="form[side]" class="input" required>
            <option value="" disabled>Elige un equipo</option>
            <optgroup v-if="options.suggested.length" :label="`Ganadores de ${phase.rounds[round - 1]?.name ?? 'la ronda anterior'}`">
              <option v-for="t in options.suggested" :key="t.id" :value="t.id">{{ label(t) }}</option>
            </optgroup>
            <optgroup :label="options.suggested.length ? 'Otros equipos inscritos' : 'Equipos inscritos'">
              <option v-for="t in options.others" :key="t.id" :value="t.id">{{ label(t) }}</option>
            </optgroup>
          </select>
        </FormField>
      </div>
      <p v-if="sameTeam" class="text-sm text-amber-800" role="alert">Elige dos equipos distintos.</p>

      <fieldset v-for="(l, i) in form.legs" :key="i" class="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <legend class="mb-1 text-sm font-semibold text-zinc-800">{{ phase.legs === 2 ? (i === 0 ? 'Ida' : 'Vuelta') : 'Partido' }}</legend>
        <FormField :id="`tie-date-${i}`" label="Fecha" required><input :id="`tie-date-${i}`" v-model="l.date" type="date" class="input" required /></FormField>
        <FormField :id="`tie-time-${i}`" label="Hora" required><input :id="`tie-time-${i}`" v-model="l.time" type="time" class="input" required /></FormField>
        <FormField :id="`tie-venue-${i}`" label="Sede" hint="Opcional" class="col-span-2 sm:col-span-1"><input :id="`tie-venue-${i}`" v-model="l.venue" class="input" /></FormField>
      </fieldset>

      <p v-if="error" class="rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">{{ error }}</p>
    </form>
    <template #footer>
      <AppButton variant="secondary" :disabled="saving" @click="emit('close')">Cancelar</AppButton>
      <AppButton type="submit" form="tie-form" :loading="saving" :disabled="!canSubmit">Agregar cruce</AppButton>
    </template>
  </BaseModal>
</template>
