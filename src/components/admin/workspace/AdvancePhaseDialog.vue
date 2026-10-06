<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ArrowDown, ArrowUp, Hand, Wand2 } from 'lucide-vue-next'
import posthog from 'posthog-js'
import { analyticsEnabled as posthogConfigured } from '@/services/analytics'
import type { ID, TournamentStructure } from '@/types'
import { getErrorMessage, tournamentService } from '@/services'
import { toISODate } from '@/utils/format'
import { KNOCKOUT_ROUND_LABEL, manualBracketSizes } from '@/utils/formats'
import BaseModal from '@/components/common/BaseModal.vue'
import AppButton from '@/components/common/AppButton.vue'
import FormField from '@/components/common/FormField.vue'

/**
 * Generar la eliminatoria desde la tabla (liga + playoffs) o los grupos. El servidor decide quién
 * clasifica; si hay empates sin criterio deportivo en posiciones que deciden algo, el organizador
 * los ordena aquí de forma explícita (queda registrado). Nunca se desempata por nombre.
 *
 * "A mano": cuadro vacío en el que el organizador elige cada cruce (Competición → Agregar cruce).
 * No exige la fase anterior terminada (pueden quedar partidos pendientes) ni la congela.
 */
const props = defineProps<{ open: boolean; tournamentId: ID; structure: TournamentStructure; teamCount: number }>()
const emit = defineEmits<{ close: []; done: [structure: TournamentStructure] }>()

const saving = ref(false)
const error = ref<string | null>(null)
const mode = ref<'auto' | 'manual'>('auto')
const sizes = computed(() => manualBracketSizes(props.teamCount))
const bracketSize = ref(2)
const form = reactive({ startDate: toISODate(new Date()), daysBetweenRounds: 7, firstKickoff: '18:00', minutesBetweenMatches: 90, venue: '' })

/** Empates por resolver, con el orden que propone el organizador (editable). */
const clusters = ref<{ scope: string; label: string; order: ID[] }[]>([])
watch(
  () => [props.open, props.structure] as const,
  ([open, s]) => {
    if (!open) return
    error.value = null
    // Sin clasificados automáticos posibles (fase incompleta), se sugiere armarla a mano.
    mode.value = s.next?.ready || hardBlockersOf(s).length === 0 ? 'auto' : 'manual'
    bracketSize.value = Math.min(sizes.value.at(-1) ?? 2, s.settings.playoffTeams ?? Infinity)
    const out: typeof clusters.value = []
    for (const p of s.phases) {
      if (p.type === 'league') p.qualification?.unresolved.forEach((u) => out.push({ scope: 'LEAGUE', label: `Tabla, posiciones ${u.positions[0]}–${u.positions[1]}`, order: [...u.teamIds] }))
      if (p.type === 'groups') {
        for (const g of p.groups) g.qualification.unresolved.forEach((u) => out.push({ scope: g.key, label: `Grupo ${g.key}, posiciones ${u.positions[0]}–${u.positions[1]}`, order: [...u.teamIds] }))
      }
    }
    clusters.value = out
  },
  { immediate: true },
)

/** Bloqueos que el organizador no puede resolver aquí (partidos pendientes). */
function hardBlockersOf(s: TournamentStructure) {
  return (s.next?.blockers ?? []).filter((b) => !/Empate/.test(b))
}
const hardBlockers = computed(() => hardBlockersOf(props.structure))

function move(list: ID[], i: number, delta: number) {
  const j = i + delta
  if (j < 0 || j >= list.length) return
  ;[list[i], list[j]] = [list[j]!, list[i]!]
}

async function submit() {
  saving.value = true
  error.value = null
  try {
    if (mode.value === 'manual') {
      emit('done', await tournamentService.advance(props.tournamentId, { manual: true, bracketSize: bracketSize.value, startDate: form.startDate, daysBetweenRounds: 7, firstKickoff: '18:00', minutesBetweenMatches: 90, venue: null, tiebreaks: [] }))
      return
    }
    const result = await tournamentService.advance(props.tournamentId, {
      startDate: form.startDate,
      daysBetweenRounds: Number(form.daysBetweenRounds),
      firstKickoff: form.firstKickoff,
      minutesBetweenMatches: Number(form.minutesBetweenMatches),
      venue: form.venue.trim() || null,
      tiebreaks: clusters.value.map((c) => ({ scope: c.scope, order: c.order })),
    })
    if (posthogConfigured) {
      posthog.capture('tournament_phase_advanced', {
        tournament_id: props.tournamentId,
        phase_count: result.phases.length,
        resolved_tiebreak_count: clusters.value.length,
      })
    }
    emit('done', result)
  } catch (e) {
    error.value = getErrorMessage(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <BaseModal :open="open" title="Eliminatoria" description="Con los clasificados en orden, o armada a mano." size="lg" @close="emit('close')">
    <div class="space-y-5">
      <fieldset>
        <legend class="mb-2 text-sm font-bold text-zinc-900">¿Cómo quieres armarla?</legend>
        <div class="grid grid-cols-2 gap-2">
          <label
            v-for="o in [{ value: 'auto', icon: Wand2, title: 'Con los clasificados', text: 'Cancha arma los cruces por posición' }, { value: 'manual', icon: Hand, title: 'A mano', text: 'Tú eliges cada cruce' }] as const"
            :key="o.value"
            class="flex cursor-pointer flex-col rounded-xl border p-3 text-sm transition has-[:checked]:border-pitch-900 has-[:checked]:bg-pitch-50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-pitch-500"
          >
            <input v-model="mode" type="radio" name="adv-mode" :value="o.value" class="sr-only" />
            <span class="flex items-center gap-1.5 font-semibold"><component :is="o.icon" class="size-4" aria-hidden="true" /> {{ o.title }}</span>
            <span class="text-xs text-zinc-500">{{ o.text }}</span>
          </label>
        </div>
      </fieldset>

      <template v-if="mode === 'manual'">
        <p class="rounded-xl bg-zinc-50 p-3 text-sm text-zinc-600">
          Se crea el cuadro vacío y agregas cada cruce (cuartos, semis, final…) con los equipos y la fecha que quieras. La fase anterior sigue abierta: puedes jugar sus partidos pendientes. El campeón sale de la final.
        </p>
        <FormField id="adv-size" label="La eliminatoria empieza en">
          <select id="adv-size" v-model.number="bracketSize" class="input">
            <option v-for="n in sizes" :key="n" :value="n">{{ KNOCKOUT_ROUND_LABEL(n) }} ({{ n }} equipos)</option>
          </select>
        </FormField>
      </template>

      <template v-else>
      <ul v-if="hardBlockers.length" class="space-y-1 rounded-xl bg-amber-50 p-3 text-sm text-amber-900" role="alert">
        <li v-for="b in hardBlockers" :key="b">{{ b }}</li>
      </ul>

      <section v-if="clusters.length" aria-labelledby="tb-title" class="space-y-3">
        <h3 id="tb-title" class="text-sm font-bold text-zinc-900">Empates sin criterio deportivo</h3>
        <p class="text-xs text-zinc-500">
          Igualan en puntos, diferencia y goles a favor. Ordénalos según el reglamento de tu torneo; tu decisión queda registrada.
        </p>
        <div v-for="c in clusters" :key="c.scope + c.order.join()" class="rounded-xl border border-zinc-200 p-3">
          <p class="mb-2 text-xs font-semibold text-zinc-600">{{ c.label }}</p>
          <ol class="space-y-1">
            <li v-for="(id, i) in c.order" :key="id" class="flex items-center gap-2 text-sm">
              <span class="tabular w-5 text-zinc-400">{{ i + 1 }}.</span>
              <span class="min-w-0 flex-1 break-words">{{ structure.teams[id]?.name ?? id }}</span>
              <AppButton variant="ghost" size="sm" icon :aria-label="`Subir ${structure.teams[id]?.name}`" :disabled="i === 0" @click="move(c.order, i, -1)"><ArrowUp class="size-4" aria-hidden="true" /></AppButton>
              <AppButton variant="ghost" size="sm" icon :aria-label="`Bajar ${structure.teams[id]?.name}`" :disabled="i === c.order.length - 1" @click="move(c.order, i, 1)"><ArrowDown class="size-4" aria-hidden="true" /></AppButton>
            </li>
          </ol>
        </div>
      </section>

      <fieldset class="grid grid-cols-2 gap-3">
        <legend class="mb-2 text-sm font-bold text-zinc-900">Calendario de la eliminatoria</legend>
        <FormField id="adv-date" label="Primera ronda"><input id="adv-date" v-model="form.startDate" type="date" class="input" /></FormField>
        <FormField id="adv-days" label="Días entre rondas"><input id="adv-days" v-model.number="form.daysBetweenRounds" type="number" min="1" max="60" class="input" /></FormField>
        <FormField id="adv-time" label="Primer partido"><input id="adv-time" v-model="form.firstKickoff" type="time" class="input" /></FormField>
        <FormField id="adv-gap" label="Minutos entre partidos"><input id="adv-gap" v-model.number="form.minutesBetweenMatches" type="number" min="0" max="240" class="input" /></FormField>
        <FormField id="adv-venue" label="Sede" hint="Opcional" class="col-span-2"><input id="adv-venue" v-model="form.venue" class="input" /></FormField>
      </fieldset>

      </template>

      <p v-if="error" class="rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">{{ error }}</p>
    </div>
    <template #footer>
      <AppButton variant="secondary" @click="emit('close')">Cancelar</AppButton>
      <AppButton :loading="saving" :disabled="mode === 'auto' && hardBlockers.length > 0" @click="submit">{{ mode === 'manual' ? 'Crear cuadro vacío' : 'Generar eliminatoria' }}</AppButton>
    </template>
  </BaseModal>
</template>
