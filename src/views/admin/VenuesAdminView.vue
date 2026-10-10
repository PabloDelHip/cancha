<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { Building2, Clock, MapPin, Pencil, Plus, Power, Server, Trash2 } from 'lucide-vue-next'
import type { Venue, VenueField } from '@/types'
import { getErrorMessage, USE_MOCKS, venueService, VENUES_REQUIRE_SERVER } from '@/services'
import { useVenues } from '@/composables/useVenues'
import { useConfirm } from '@/composables/useConfirm'
import { useToast } from '@/composables/useToast'
import { plural } from '@/utils/format'
import PageHeader from '@/components/common/PageHeader.vue'
import AppButton from '@/components/common/AppButton.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import VenueDialog from '@/components/admin/venues/VenueDialog.vue'
import FieldDialog from '@/components/admin/venues/FieldDialog.vue'

/**
 * Mis sedes: canchas que el organizador usa en todas sus ligas y torneos. Al programar un partido
 * se elige la cancha y el servidor rechaza choques de horario entre cualquiera de sus torneos.
 * Una sede o cancha con partidos no se borra: se archiva y sus partidos la conservan.
 */
const { venues, set } = useVenues()
const loading = ref(true)
const error = ref<string | null>(null)
const { confirm } = useConfirm()
const toast = useToast()

async function load() {
  if (USE_MOCKS) return
  loading.value = true
  error.value = null
  try {
    set(await venueService.list())
  } catch (e) {
    error.value = getErrorMessage(e)
  } finally {
    loading.value = false
  }
}
onMounted(load)

const venueDialog = reactive<{ open: boolean; venue: Venue | null }>({ open: false, venue: null })
const fieldDialog = reactive<{ open: boolean; venue: Venue | null; field: VenueField | null }>({ open: false, venue: null, field: null })

/** Reemplaza la sede editada en la lista (el selector de cancha usa la misma lista). */
function replace(v: Venue) {
  const list = venues.value.some((x) => x.id === v.id) ? venues.value.map((x) => (x.id === v.id ? v : x)) : [...venues.value, v]
  set(list.sort((a, b) => a.name.localeCompare(b.name)))
}

async function toggleVenue(v: Venue) {
  try {
    replace(await venueService.update(v.id, { active: !v.active }))
    toast.success(v.active ? 'Sede desactivada: sus canchas ya no se ofrecen al programar.' : 'Sede activada.')
  } catch (e) {
    toast.error(getErrorMessage(e))
  }
}
async function toggleField(v: Venue, f: VenueField) {
  try {
    replace(await venueService.updateField(v.id, f.id, { active: !f.active }))
    toast.success(f.active ? 'Cancha desactivada.' : 'Cancha activada.')
  } catch (e) {
    toast.error(getErrorMessage(e))
  }
}
async function removeVenue(v: Venue) {
  const used = v.fields.some((f) => f.matches)
  const ok = await confirm({
    title: `¿Eliminar ${v.name}?`,
    message: used ? 'Tiene partidos registrados: se archivará y esos partidos conservarán su cancha.' : 'Se borrará con sus canchas.',
    confirmLabel: 'Eliminar sede',
    tone: 'danger',
  })
  if (!ok) return
  try {
    const { archived } = await venueService.remove(v.id)
    set(venues.value.filter((x) => x.id !== v.id))
    toast.success(archived ? 'Sede archivada.' : 'Sede eliminada.')
  } catch (e) {
    toast.error(getErrorMessage(e))
  }
}
async function removeField(v: Venue, f: VenueField) {
  const ok = await confirm({
    title: `¿Eliminar ${f.name}?`,
    message: f.matches ? 'Tiene partidos registrados: se archivará y esos partidos la conservarán.' : 'Se borrará de la sede.',
    confirmLabel: 'Eliminar cancha',
    tone: 'danger',
  })
  if (!ok) return
  try {
    const { archived, venue } = await venueService.removeField(v.id, f.id)
    replace(venue)
    toast.success(archived ? 'Cancha archivada.' : 'Cancha eliminada.')
  } catch (e) {
    toast.error(getErrorMessage(e))
  }
}

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const hours = (f: VenueField) =>
  f.availability.weekly.length ? f.availability.weekly.map((w) => `${DAYS[w.day]} ${w.from}–${w.to}`).join(' · ') : 'Sin restricción de horario'
</script>

<template>
  <div>
    <PageHeader eyebrow="Panel del organizador" title="Sedes" subtitle="Tus canchas, para todas tus ligas y torneos. Evitan que dos partidos se crucen en la misma cancha.">
      <template v-if="!USE_MOCKS" #actions>
        <AppButton @click="Object.assign(venueDialog, { open: true, venue: null })"><Plus class="size-4" aria-hidden="true" /> Nueva sede</AppButton>
      </template>
    </PageHeader>

    <EmptyState v-if="USE_MOCKS" :icon="Server" title="Requiere el servidor" :description="`${VENUES_REQUIRE_SERVER}.`" class="card" />
    <LoadingState v-else-if="loading" />
    <ErrorState v-else-if="error" :message="error" @retry="load" />
    <ul v-else-if="venues.length" class="space-y-4">
      <li v-for="v in venues" :key="v.id" class="card overflow-hidden">
        <div class="flex flex-wrap items-start gap-3 border-b border-zinc-100 p-4">
          <span class="grid size-11 shrink-0 place-items-center rounded-xl bg-pitch-950 text-lime-300"><Building2 class="size-5" aria-hidden="true" /></span>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <p class="text-lg font-bold text-zinc-950">{{ v.name }}</p>
              <StatusBadge v-if="!v.active" label="Desactivada" tone="neutral" />
            </div>
            <p class="flex flex-wrap items-center gap-x-3 text-sm text-zinc-500">
              <span v-if="v.address" class="inline-flex items-center gap-1"><MapPin class="size-3.5" aria-hidden="true" /> {{ v.address }}</span>
              <span class="inline-flex items-center gap-1"><Clock class="size-3.5" aria-hidden="true" /> {{ v.bufferMinutes }} min entre partidos</span>
            </p>
          </div>
          <div class="flex flex-wrap gap-1">
            <AppButton variant="ghost" size="sm" @click="Object.assign(venueDialog, { open: true, venue: v })"><Pencil class="size-4" aria-hidden="true" /> Editar</AppButton>
            <AppButton variant="ghost" size="sm" @click="toggleVenue(v)"><Power class="size-4" aria-hidden="true" /> {{ v.active ? 'Desactivar' : 'Activar' }}</AppButton>
            <AppButton variant="ghost" size="sm" class="text-red-700" @click="removeVenue(v)"><Trash2 class="size-4" aria-hidden="true" /> Eliminar</AppButton>
          </div>
        </div>
        <ul class="divide-y divide-zinc-100">
          <li v-for="f in v.fields" :key="f.id" class="flex flex-wrap items-center gap-3 px-4 py-3">
            <div class="min-w-0 flex-1">
              <p class="flex flex-wrap items-center gap-2 font-semibold text-zinc-900">
                {{ f.name }}
                <StatusBadge v-if="!f.active" label="Desactivada" tone="neutral" />
              </p>
              <p class="text-xs text-zinc-500">
                {{ hours(f) }}<template v-if="f.availability.closedDates.length"> · {{ plural(f.availability.closedDates.length, 'fecha cerrada', 'fechas cerradas') }}</template>
                · {{ plural(f.matches, 'partido', 'partidos') }}<template v-if="f.pendingMatches"> ({{ f.pendingMatches }} por jugar)</template>
              </p>
            </div>
            <div class="flex flex-wrap gap-1">
              <AppButton variant="ghost" size="sm" @click="Object.assign(fieldDialog, { open: true, venue: v, field: f })"><Pencil class="size-4" aria-hidden="true" /> Editar</AppButton>
              <AppButton variant="ghost" size="sm" @click="toggleField(v, f)"><Power class="size-4" aria-hidden="true" /> {{ f.active ? 'Desactivar' : 'Activar' }}</AppButton>
              <AppButton variant="ghost" size="sm" class="text-red-700" :aria-label="`Eliminar ${f.name}`" @click="removeField(v, f)"><Trash2 class="size-4" aria-hidden="true" /></AppButton>
            </div>
          </li>
          <li class="px-4 py-2">
            <AppButton variant="ghost" size="sm" @click="Object.assign(fieldDialog, { open: true, venue: v, field: null })"><Plus class="size-4" aria-hidden="true" /> Agregar cancha</AppButton>
          </li>
        </ul>
      </li>
    </ul>
    <EmptyState v-else :icon="Building2" title="Registra tu primera sede" description="Con tus canchas registradas puedes asignarlas a cada partido y evitar choques de horario entre tus torneos." class="card">
      <AppButton @click="Object.assign(venueDialog, { open: true, venue: null })"><Plus class="size-4" aria-hidden="true" /> Nueva sede</AppButton>
    </EmptyState>

    <VenueDialog :open="venueDialog.open" :venue="venueDialog.venue" @close="venueDialog.open = false" @saved="replace" />
    <FieldDialog :open="fieldDialog.open" :venue="fieldDialog.venue" :field="fieldDialog.field" @close="fieldDialog.open = false" @saved="replace" />
  </div>
</template>
