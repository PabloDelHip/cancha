<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Bot, History } from 'lucide-vue-next'
import type { MatchLog } from '@/types'
import { getErrorMessage, matchLogService } from '@/services'
import { describeEntry } from '@/utils/matchLog'
import { formatDate, toISODate } from '@/utils/format'
import BaseModal from '@/components/common/BaseModal.vue'
import AppButton from '@/components/common/AppButton.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import LoadingState from '@/components/common/LoadingState.vue'

/**
 * Historial de partidos. Con `matchId`, el de un partido en orden cronológico (también si ya se
 * eliminó). Sin él, el del torneo, lo más reciente primero, con opción de ver solo eliminados.
 */
const props = defineProps<{ open: boolean; matchId?: string | null; tournamentId?: string | null; title: string }>()
const emit = defineEmits<{ close: [] }>()
const data = ref<MatchLog | null>(null)
const loading = ref(false)
const error = ref('')
const onlyDeleted = ref(false)

async function load() {
  loading.value = true
  error.value = ''
  try {
    data.value = props.matchId
      ? await matchLogService.ofMatch(props.matchId)
      : await matchLogService.ofTournament(props.tournamentId!, { deleted: onlyDeleted.value })
  } catch (e) {
    error.value = getErrorMessage(e)
  } finally {
    loading.value = false
  }
}
watch(
  () => props.open,
  (open) => {
    if (open) {
      onlyDeleted.value = false
      void load()
    }
  },
)
watch(onlyDeleted, () => props.open && load())

const items = computed(() => (data.value ? data.value.entries.map((e) => ({ e, ...describeEntry(e, data.value!.refs) })) : []))
const when = (iso: string) => {
  const d = new Date(iso)
  return `${formatDate(toISODate(d))} ${d.toTimeString().slice(0, 5)}`
}
</script>

<template>
  <BaseModal :open="open" :title="title" :description="matchId ? 'Cambios del partido en orden cronológico.' : 'Cambios de los partidos del torneo, lo más reciente primero.'" size="lg" @close="emit('close')">
    <label v-if="!matchId" class="mb-3 flex items-center gap-2 text-sm">
      <input v-model="onlyDeleted" type="checkbox" class="size-4 accent-pitch-700" /> Solo partidos eliminados
    </label>
    <LoadingState v-if="loading" />
    <p v-else-if="error" class="rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">{{ error }}</p>
    <ol v-else-if="items.length" class="relative space-y-3 border-l border-zinc-200 pl-4">
      <li v-for="{ e, title: headline, details, system, by } in items" :key="e.id" class="relative">
        <span class="absolute top-1.5 -left-[21px] size-2.5 rounded-full ring-2 ring-white" :class="system ? 'bg-sky-500' : e.action === 'DELETED' || e.action === 'SCHEDULE_REPLACED' ? 'bg-red-500' : 'bg-pitch-600'" aria-hidden="true" />
        <p class="text-sm font-semibold text-zinc-900">{{ headline }}</p>
        <p v-for="d in details" :key="d" class="text-xs text-zinc-600">{{ d }}</p>
        <p v-if="e.reason" class="text-xs text-zinc-600">Motivo: “{{ e.reason }}”</p>
        <p class="flex items-center gap-1 text-[11px] text-zinc-400">
          {{ when(e.createdAt) }}
          <template v-if="system"> · <Bot class="size-3" aria-hidden="true" /> automático</template>
          <template v-if="by"> · {{ system ? `provocado por ${by}` : by }}</template>
        </p>
      </li>
    </ol>
    <EmptyState
      v-else
      :icon="History"
      :title="onlyDeleted ? 'No se ha eliminado ningún partido' : 'Sin cambios registrados'"
      description="El historial empieza con los cambios hechos desde que existe (los partidos anteriores no tienen historia previa)."
      compact
    />
    <template #footer>
      <AppButton variant="secondary" @click="emit('close')">Cerrar</AppButton>
    </template>
  </BaseModal>
</template>
