<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { AlertTriangle, Archive, Trophy } from 'lucide-vue-next'
import posthog from 'posthog-js'
import { analyticsEnabled as posthogConfigured } from '@/services/analytics'
import { useTournamentsStore } from '@/stores'
import { posthogLog } from '@/services/posthogLogs'
import { useTournamentStats } from '@/composables/useTournamentStats'
import { useTournamentLifecycle } from '@/composables/useTournamentLifecycle'
import { useToast } from '@/composables/useToast'
import { getErrorMessage } from '@/services'
import { plural } from '@/utils/format'
import BaseModal from '@/components/common/BaseModal.vue'
import AppButton from '@/components/common/AppButton.vue'
import TeamLogo from '@/components/teams/TeamLogo.vue'

/**
 * Cierre del torneo. No borra nada: tabla, resultados, estadísticas y participaciones quedan
 * como historial. Si hay partidos sin jugar hay que confirmarlo expresamente.
 */
const tournaments = useTournamentsStore()
const { finishing, closeFinish } = useTournamentLifecycle()
const toast = useToast()

const stats = useTournamentStats(() => finishing.value ?? '')
const t = computed(() => stats.tournament.value)
const counts = computed(() => {
  const list = stats.matches.value
  return {
    total: list.length,
    finished: list.filter((m) => m.status === 'finished').length,
    open: list.filter((m) => m.status === 'scheduled' || m.status === 'live').length,
    postponed: list.filter((m) => m.status === 'postponed').length,
    cancelled: list.filter((m) => m.status === 'cancelled').length,
  }
})
const pending = computed(() => counts.value.open + counts.value.postponed)
const leader = computed(() => (counts.value.finished ? stats.standings.value[0] : undefined))
const leaderTeam = computed(() => stats.teams.value.find((team) => team.id === leader.value?.teamId))

const acknowledged = ref(false)
const saving = ref(false)
watch(finishing, () => (acknowledged.value = false))

async function finish() {
  if (!t.value) return
  saving.value = true
  try {
    // El backend vuelve a comprobar los pendientes: sin confirmación explícita responde 409.
    await tournaments.finish(t.value.id, acknowledged.value)
    if (posthogConfigured) {
      posthog.capture('tournament_finished', {
        tournament_id: t.value.id,
        total_match_count: counts.value.total,
        finished_match_count: counts.value.finished,
        pending_match_count: pending.value,
        acknowledged_pending_matches: acknowledged.value,
      })
    }
    posthogLog.info('tournament finished', {
      total_match_count: counts.value.total,
      finished_match_count: counts.value.finished,
      pending_match_count: pending.value,
      acknowledged_pending_matches: acknowledged.value,
    })
    toast.success(`${t.value.name} finalizado. Queda como historial.`)
    closeFinish()
  } catch (e) {
    toast.error(getErrorMessage(e))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <BaseModal
    :open="!!finishing && !!t"
    :title="`Finalizar ${t?.name ?? 'torneo'}`"
    description="Esta acción cierra la competición. No se borra nada."
    role="alertdialog"
    @close="saving || closeFinish()"
  >
    <div v-if="t" class="space-y-4 text-sm">
      <dl class="tabular grid grid-cols-3 gap-2 text-center">
        <div class="rounded-xl bg-zinc-50 p-3">
          <dt class="text-xs text-zinc-500">Partidos</dt>
          <dd class="font-display text-2xl font-bold">{{ counts.total }}</dd>
        </div>
        <div class="rounded-xl bg-pitch-50 p-3">
          <dt class="text-xs text-pitch-700">Finalizados</dt>
          <dd class="font-display text-2xl font-bold text-pitch-800">{{ counts.finished }}</dd>
        </div>
        <div class="rounded-xl p-3" :class="pending > 0 ? 'bg-amber-50' : 'bg-zinc-50'">
          <dt class="text-xs" :class="pending > 0 ? 'text-amber-800' : 'text-zinc-500'">Pendientes</dt>
          <dd class="font-display text-2xl font-bold" :class="pending > 0 && 'text-amber-800'">{{ pending }}</dd>
        </div>
      </dl>

      <div v-if="leaderTeam" class="flex items-center gap-3 rounded-xl border border-zinc-200 p-3">
        <Trophy class="size-5 shrink-0 text-amber-500" aria-hidden="true" />
        <TeamLogo :team="leaderTeam" size="sm" />
        <p>
          <span class="font-semibold">{{ leaderTeam.name }}</span> termina primero con {{ leader?.points }} puntos.
        </p>
      </div>

      <div v-if="pending" class="flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-900">
        <AlertTriangle class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <div class="space-y-2">
          <p>
            Quedan <strong>{{ plural(pending, 'partido') }} sin jugar</strong>
            <template v-if="counts.postponed"> ({{ counts.postponed }} pospuesto{{ counts.postponed === 1 ? '' : 's' }})</template>.
            No contarán en la tabla final.
          </p>
          <label class="flex cursor-pointer items-start gap-2 font-semibold">
            <input v-model="acknowledged" type="checkbox" class="mt-0.5 size-4 accent-amber-600" />
            Entiendo que el torneo terminará con partidos sin jugar.
          </label>
        </div>
      </div>

      <div class="flex gap-3 rounded-xl bg-zinc-50 p-3 text-zinc-600">
        <Archive class="mt-0.5 size-5 shrink-0 text-zinc-400" aria-hidden="true" />
        <p>
          Tabla final, resultados, goleadores, plantillas y estadísticas seguirán visibles en la página pública y en los
          perfiles de los jugadores. Ya no podrás capturar resultados, programar partidos ni cambiar plantillas.
        </p>
      </div>
    </div>

    <template #footer>
      <AppButton variant="secondary" :disabled="saving" @click="closeFinish()">Cancelar</AppButton>
      <AppButton variant="danger" :loading="saving" :disabled="pending > 0 && !acknowledged" @click="finish">
        Finalizar torneo
      </AppButton>
    </template>
  </BaseModal>
</template>
