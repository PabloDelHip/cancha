<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { History, Mail, Pencil, Phone, Plus, Power, Server, Trash2, UserRound } from 'lucide-vue-next'
import type { Referee } from '@/types'
import { getErrorMessage, refereeService, REFEREES_REQUIRE_SERVER, USE_MOCKS } from '@/services'
import { useConfirm } from '@/composables/useConfirm'
import { useToast } from '@/composables/useToast'
import { plural } from '@/utils/format'
import PageHeader from '@/components/common/PageHeader.vue'
import AppButton from '@/components/common/AppButton.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import RefereeDialog from '@/components/admin/referees/RefereeDialog.vue'
import RefereeHistoryDialog from '@/components/admin/referees/RefereeHistoryDialog.vue'

/**
 * Mis árbitros: los asigno a partidos de cualquiera de mis torneos desde el calendario. El servidor
 * rechaza asignar a alguien a dos partidos que se cruzan. Uno con partidos no se borra: se archiva.
 */
const referees = ref<Referee[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const { confirm } = useConfirm()
const toast = useToast()
const dialog = reactive<{ open: boolean; referee: Referee | null }>({ open: false, referee: null })
const history = reactive<{ open: boolean; referee: Referee | null }>({ open: false, referee: null })

async function load() {
  if (USE_MOCKS) return
  loading.value = true
  error.value = null
  try {
    referees.value = await refereeService.list()
  } catch (e) {
    error.value = getErrorMessage(e)
  } finally {
    loading.value = false
  }
}
onMounted(load)

function replace(r: Referee) {
  const list = referees.value.some((x) => x.id === r.id) ? referees.value.map((x) => (x.id === r.id ? r : x)) : [...referees.value, r]
  referees.value = list.sort((a, b) => a.lastName.localeCompare(b.lastName))
}
async function toggle(r: Referee) {
  try {
    replace(await refereeService.update(r.id, { active: !r.active }))
    toast.success(r.active ? 'Árbitro desactivado: ya no se ofrece al asignar.' : 'Árbitro activado.')
  } catch (e) {
    toast.error(getErrorMessage(e))
  }
}
async function remove(r: Referee) {
  const ok = await confirm({
    title: `¿Eliminar a ${r.name}?`,
    message: r.matches ? 'Tiene partidos registrados: se archivará y su historial se conserva.' : 'Se borrará.',
    confirmLabel: 'Eliminar',
    tone: 'danger',
  })
  if (!ok) return
  try {
    const { archived } = await refereeService.remove(r.id)
    referees.value = referees.value.filter((x) => x.id !== r.id)
    toast.success(archived ? 'Árbitro archivado.' : 'Árbitro eliminado.')
  } catch (e) {
    toast.error(getErrorMessage(e))
  }
}
</script>

<template>
  <div>
    <PageHeader eyebrow="Panel del organizador" title="Árbitros" subtitle="Para todas tus ligas y torneos. Asígnalos desde el calendario de cada torneo.">
      <template v-if="!USE_MOCKS" #actions>
        <AppButton @click="Object.assign(dialog, { open: true, referee: null })"><Plus class="size-4" aria-hidden="true" /> Nuevo árbitro</AppButton>
      </template>
    </PageHeader>

    <EmptyState v-if="USE_MOCKS" :icon="Server" title="Requiere el servidor" :description="`${REFEREES_REQUIRE_SERVER}.`" class="card" />
    <LoadingState v-else-if="loading" />
    <ErrorState v-else-if="error" :message="error" @retry="load" />
    <ul v-else-if="referees.length" class="card divide-y divide-zinc-100">
      <li v-for="r in referees" :key="r.id" class="flex flex-wrap items-center gap-3 px-4 py-3">
        <span class="grid size-10 shrink-0 place-items-center rounded-full bg-zinc-900 text-sm font-bold text-white">{{ r.firstName[0] }}{{ r.lastName[0] }}</span>
        <div class="min-w-0 flex-1">
          <p class="flex flex-wrap items-center gap-2 font-semibold text-zinc-900">
            {{ r.name }}
            <StatusBadge v-if="!r.active" label="Desactivado" tone="neutral" />
          </p>
          <p class="flex flex-wrap items-center gap-x-3 text-xs text-zinc-500">
            <span v-if="r.phone" class="inline-flex items-center gap-1"><Phone class="size-3" aria-hidden="true" /> {{ r.phone }}</span>
            <span v-if="r.email" class="inline-flex items-center gap-1"><Mail class="size-3" aria-hidden="true" /> {{ r.email }}</span>
            <span>{{ plural(r.matches, 'partido', 'partidos') }}<template v-if="r.pendingMatches"> ({{ r.pendingMatches }} por jugar)</template></span>
          </p>
        </div>
        <div class="flex flex-wrap gap-1">
          <AppButton variant="ghost" size="sm" @click="Object.assign(history, { open: true, referee: r })"><History class="size-4" aria-hidden="true" /> Partidos</AppButton>
          <AppButton variant="ghost" size="sm" @click="Object.assign(dialog, { open: true, referee: r })"><Pencil class="size-4" aria-hidden="true" /> Editar</AppButton>
          <AppButton variant="ghost" size="sm" @click="toggle(r)"><Power class="size-4" aria-hidden="true" /> {{ r.active ? 'Desactivar' : 'Activar' }}</AppButton>
          <AppButton variant="ghost" size="sm" class="text-red-700" :aria-label="`Eliminar a ${r.name}`" @click="remove(r)"><Trash2 class="size-4" aria-hidden="true" /></AppButton>
        </div>
      </li>
    </ul>
    <EmptyState v-else :icon="UserRound" title="Registra a tus árbitros" description="Después asígnalos a los partidos desde el calendario: evitamos que uno quede en dos partidos a la misma hora." class="card">
      <AppButton @click="Object.assign(dialog, { open: true, referee: null })"><Plus class="size-4" aria-hidden="true" /> Nuevo árbitro</AppButton>
    </EmptyState>

    <RefereeDialog :open="dialog.open" :referee="dialog.referee" @close="dialog.open = false" @saved="replace" />
    <RefereeHistoryDialog :open="history.open" :referee="history.referee" @close="history.open = false" />
  </div>
</template>
