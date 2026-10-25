<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { AlertTriangle, Archive, Medal, OctagonAlert, Trophy } from 'lucide-vue-next'
import posthog from 'posthog-js'
import type { ClosurePreview } from '@/types'
import { analyticsEnabled as posthogConfigured } from '@/services/analytics'
import { useTournamentsStore } from '@/stores'
import { posthogLog } from '@/services/posthogLogs'
import { useTournamentLifecycle } from '@/composables/useTournamentLifecycle'
import { useToast } from '@/composables/useToast'
import { getErrorMessage, getErrorStatus, tournamentService } from '@/services'
import { plural } from '@/utils/format'
import { closureConfirmation } from '@/utils/closure'
import BaseModal from '@/components/common/BaseModal.vue'
import AppButton from '@/components/common/AppButton.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import LoadingState from '@/components/common/LoadingState.vue'

/**
 * Cierre del torneo. No borra nada: tabla, resultados, estadísticas y participaciones quedan
 * como historial. 10B: lo que se muestra sale de la vista previa del servidor
 * (GET /tournaments/:id/closure), con las mismas reglas que aplica POST /finish:
 * - bloqueantes (p. ej. un partido en juego): no se puede confirmar;
 * - advertencias (partidos sin jugar, sanciones, adeudos): se confirma expresamente.
 * El servidor vuelve a validar todo al finalizar; un 409 recarga la vista previa.
 */
const tournaments = useTournamentsStore()
const { finishing, closeFinish } = useTournamentLifecycle()
const toast = useToast()

const t = computed(() => (finishing.value ? tournaments.get(finishing.value) : undefined))
const preview = ref<ClosurePreview | null>(null)
const loadError = ref<string | null>(null)
const loading = ref(false)
const acknowledged = ref(false)
const saving = ref(false)
/** Mensaje del servidor al rechazar el cierre (se muestra junto a la vista previa recargada). */
const rejected = ref<string | null>(null)

async function load() {
  const id = finishing.value
  if (!id) return
  loading.value = true
  loadError.value = null
  try {
    const p = await tournamentService.closure(id)
    if (finishing.value === id) preview.value = p
  } catch (e) {
    loadError.value = getErrorMessage(e)
  } finally {
    loading.value = false
  }
}
watch(
  finishing,
  (id) => {
    acknowledged.value = false
    rejected.value = null
    preview.value = null
    if (id) void load()
  },
  { immediate: true },
)

const confirmation = computed(() => (preview.value ? closureConfirmation(preview.value) : null))
const blocked = computed(() => !!confirmation.value?.blocked)
const warnings = computed(() => preview.value?.warnings ?? [])
const canConfirm = computed(() => !!preview.value && preview.value.canFinish && acknowledged.value && !saving.value && !loading.value)

async function finish() {
  const p = preview.value
  if (!t.value || !p || !canConfirm.value) return
  saving.value = true
  rejected.value = null
  const id = t.value.id
  const name = t.value.name
  try {
    // Confirmar los pendientes solo cuando la vista previa los mostró (el servidor los recuenta).
    await tournaments.finish(id, closureConfirmation(p).allowPendingMatches)
    const props = {
      total_match_count: p.matches.total,
      finished_match_count: p.matches.finished,
      pending_match_count: p.matches.pending,
      acknowledged_pending_matches: p.requiresConfirmation,
      warning_count: p.warnings.length,
    }
    if (posthogConfigured) posthog.capture('tournament_finished', { tournament_id: id, ...props })
    posthogLog.info('tournament finished', props)
    toast.success(`${name} finalizado. Sus resultados quedan protegidos como historial.`)
    closeFinish()
  } catch (e) {
    if (getErrorStatus(e) === 409) {
      // Cambió algo mientras se revisaba (otro partido en juego, nuevos pendientes u otro cierre).
      const msg = getErrorMessage(e)
      await load()
      if (preview.value?.status === 'finished') {
        tournaments.replace(await tournamentService.getOwned(id))
        toast.info(`${name} ya estaba finalizado (lo cerró otra persona).`)
        closeFinish()
        return
      }
      acknowledged.value = false
      rejected.value = msg
    } else toast.error(getErrorMessage(e))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <BaseModal
    :open="!!finishing && !!t"
    :title="`Finalizar ${t?.name ?? 'torneo'}`"
    description="Revisa cómo queda el torneo antes de cerrarlo. No se borra nada."
    role="alertdialog"
    size="lg"
    @close="saving || closeFinish()"
  >
    <LoadingState v-if="loading && !preview" />
    <ErrorState v-else-if="loadError && !preview" :message="loadError" @retry="load" />
    <div v-else-if="preview" class="space-y-4 text-sm" :aria-busy="loading">
      <dl class="tabular grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
        <div class="rounded-xl bg-zinc-50 p-3">
          <dt class="text-xs text-zinc-500">Partidos</dt>
          <dd class="font-display text-2xl font-bold">{{ preview.matches.total }}</dd>
        </div>
        <div class="rounded-xl bg-pitch-50 p-3">
          <dt class="text-xs text-pitch-700">Jugados</dt>
          <dd class="font-display text-2xl font-bold text-pitch-800">{{ preview.matches.finished }}</dd>
        </div>
        <div class="rounded-xl p-3" :class="preview.matches.pending > 0 ? 'bg-amber-50' : 'bg-zinc-50'">
          <dt class="text-xs" :class="preview.matches.pending > 0 ? 'text-amber-800' : 'text-zinc-500'">Sin jugar</dt>
          <dd class="font-display text-2xl font-bold" :class="preview.matches.pending > 0 && 'text-amber-800'">{{ preview.matches.pending }}</dd>
        </div>
        <div class="rounded-xl bg-zinc-50 p-3">
          <dt class="text-xs text-zinc-500">Equipos</dt>
          <dd class="font-display text-2xl font-bold">{{ preview.teams.enrolled }}</dd>
        </div>
      </dl>

      <section v-if="preview.champion || preview.topScorers.length" class="space-y-2 rounded-xl border border-zinc-200 p-3" aria-label="Resultado deportivo">
        <p v-if="preview.champion" class="flex items-center gap-2">
          <Trophy class="size-5 shrink-0 text-amber-500" aria-hidden="true" />
          <span>Campeón: <strong>{{ preview.champion.name }}</strong></span>
        </p>
        <p v-if="preview.runnerUp" class="flex items-center gap-2">
          <Medal class="size-5 shrink-0 text-zinc-400" aria-hidden="true" />
          <span>Subcampeón: <strong>{{ preview.runnerUp.name }}</strong></span>
        </p>
        <p v-if="preview.topScorers[0]" class="text-zinc-600">
          Goleo: <strong class="text-zinc-900">{{ preview.topScorers[0].name }}</strong> ({{ preview.topScorers[0].team }}) con {{ plural(preview.topScorers[0].goals, 'gol', 'goles') }}.
        </p>
      </section>

      <p v-if="rejected" class="rounded-xl border border-red-200 bg-red-50 p-3 text-red-900" role="alert">
        El servidor no permitió finalizar: {{ rejected }}. Revisa la información actualizada.
      </p>

      <section v-if="blocked" class="flex gap-3 rounded-xl border border-red-300 bg-red-50 p-3 text-red-900" aria-labelledby="closure-blockers">
        <OctagonAlert class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <div>
          <h3 id="closure-blockers" class="font-semibold">Todavía no se puede finalizar</h3>
          <ul class="mt-1 list-disc space-y-1 pl-4">
            <li v-for="b in preview.blockers" :key="b.code + b.message">{{ b.message }}</li>
          </ul>
        </div>
      </section>

      <section v-if="warnings.length" class="flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-900" aria-labelledby="closure-warnings">
        <AlertTriangle class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <div>
          <h3 id="closure-warnings" class="font-semibold">{{ warnings.length === 1 ? 'Revisa esto antes de cerrar' : `Revisa estos ${warnings.length} puntos antes de cerrar` }}</h3>
          <ul class="mt-1 list-disc space-y-1 pl-4">
            <li v-for="w in warnings" :key="w.code">{{ w.message }}</li>
          </ul>
          <p v-if="preview.matches.pending" class="mt-2">Los partidos sin jugar no contarán en la tabla final.</p>
        </div>
      </section>

      <div class="flex gap-3 rounded-xl bg-zinc-50 p-3 text-zinc-600">
        <Archive class="mt-0.5 size-5 shrink-0 text-zinc-400" aria-hidden="true" />
        <p>
          <strong class="text-zinc-800">Al finalizar, los resultados quedan protegidos.</strong> Tabla final, resultados, goleadores, plantillas,
          estadísticas y reportes seguirán disponibles, pero ya no podrás capturar resultados, programar partidos, cambiar plantillas ni
          reabrir el torneo. Los cobros pendientes se pueden seguir registrando.
        </p>
      </div>

      <label v-if="!blocked" class="flex cursor-pointer items-start gap-2 font-semibold text-zinc-900">
        <input v-model="acknowledged" type="checkbox" class="mt-0.5 size-4 accent-red-600" :disabled="saving" />
        {{ confirmation?.label }}
      </label>
    </div>

    <template #footer>
      <AppButton variant="secondary" :disabled="saving" @click="closeFinish()">{{ blocked ? 'Cerrar' : 'Cancelar' }}</AppButton>
      <AppButton v-if="!blocked" variant="danger" :loading="saving" :disabled="!canConfirm" @click="finish">Finalizar torneo</AppButton>
    </template>
  </BaseModal>
</template>
