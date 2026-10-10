<script setup lang="ts">
import { ref, watch } from 'vue'
import { History } from 'lucide-vue-next'
import type { Referee, RefereeHistoryEntry } from '@/types'
import { getErrorMessage, refereeService } from '@/services'
import { formatDate } from '@/utils/format'
import { MATCH_STATUS, REFEREE_ROLE } from '@/utils/labels'
import BaseModal from '@/components/common/BaseModal.vue'
import AppButton from '@/components/common/AppButton.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import LoadingState from '@/components/common/LoadingState.vue'

/** Partidos asignados a un árbitro en todos los torneos del organizador, con ausencias y sustituciones. */
const props = defineProps<{ open: boolean; referee: Referee | null }>()
const emit = defineEmits<{ close: [] }>()
const entries = ref<RefereeHistoryEntry[]>([])
const loading = ref(false)
const error = ref('')

watch(
  () => props.open,
  async (open) => {
    if (!open || !props.referee) return
    loading.value = true
    error.value = ''
    try {
      entries.value = await refereeService.history(props.referee.id)
    } catch (e) {
      error.value = getErrorMessage(e)
    } finally {
      loading.value = false
    }
  },
)
</script>

<template>
  <BaseModal :open="open" :title="referee ? `Partidos de ${referee.name}` : 'Partidos'" description="Todos tus torneos, del más reciente al más antiguo." size="lg" @close="emit('close')">
    <LoadingState v-if="loading" />
    <p v-else-if="error" class="rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">{{ error }}</p>
    <ul v-else-if="entries.length" class="divide-y divide-zinc-100">
      <li v-for="e in entries" :key="e.assignmentId" class="py-2.5 text-sm">
        <div class="flex flex-wrap items-center gap-2">
          <span class="font-semibold text-zinc-900">{{ e.match.homeTeam }} vs {{ e.match.awayTeam }}</span>
          <span v-if="e.match.homeScore !== null" class="tabular text-zinc-500">{{ e.match.homeScore }}–{{ e.match.awayScore }}</span>
          <StatusBadge v-bind="MATCH_STATUS[e.match.status]" class="ml-auto" />
        </div>
        <p class="text-xs text-zinc-500">
          {{ formatDate(e.match.date) }} {{ e.match.time }} · {{ e.match.tournamentName }}<template v-if="e.match.venue"> · {{ e.match.venue }}</template> · {{ REFEREE_ROLE[e.role] }}
        </p>
        <p v-if="e.status === 'absent'" class="text-xs font-semibold text-red-700">
          No se presentó<template v-if="e.replacedBy">: lo sustituyó {{ e.replacedBy }}</template><template v-if="e.absenceNote"> ({{ e.absenceNote }})</template>
        </p>
        <p v-if="e.substituteFor" class="text-xs text-zinc-600">Sustituyó a {{ e.substituteFor }}</p>
      </li>
    </ul>
    <EmptyState v-else :icon="History" title="Sin partidos asignados" compact />
    <template #footer>
      <AppButton variant="secondary" @click="emit('close')">Cerrar</AppButton>
    </template>
  </BaseModal>
</template>
