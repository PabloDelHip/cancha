<script setup lang="ts">
import { ref } from 'vue'
import { Plus, Trash2 } from 'lucide-vue-next'
import type { FieldAvailability } from '@/types'
import { formatDate } from '@/utils/format'
import AppButton from '@/components/common/AppButton.vue'

/**
 * Horario semanal (vacío = sin restricción) y fechas no disponibles. Lo usan canchas y árbitros:
 * en ambos casos solo genera avisos al programar o asignar, nunca bloquea.
 */
const model = defineModel<FieldAvailability>({ required: true })
withDefaults(defineProps<{ idPrefix: string; closedLabel?: string }>(), { closedLabel: 'Fechas no disponibles' })
const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const newDate = ref('')

function addWindow() {
  model.value.weekly.push({ day: 6, from: '08:00', to: '22:00' })
}
function addDate() {
  if (newDate.value && !model.value.closedDates.includes(newDate.value)) model.value.closedDates = [...model.value.closedDates, newDate.value].sort()
  newDate.value = ''
}
</script>

<template>
  <fieldset class="space-y-2">
    <legend class="text-sm font-semibold text-zinc-900">Horario disponible</legend>
    <p class="text-xs text-zinc-500">Sin horarios = disponible siempre. Fuera de horario verás un aviso, pero se puede guardar.</p>
    <div v-for="(w, i) in model.weekly" :key="i" class="flex flex-wrap items-center gap-2">
      <label class="sr-only" :for="`${idPrefix}-day-${i}`">Día</label>
      <select :id="`${idPrefix}-day-${i}`" v-model.number="w.day" class="input w-36">
        <option v-for="(d, n) in DAYS" :key="n" :value="n">{{ d }}</option>
      </select>
      <label class="sr-only" :for="`${idPrefix}-from-${i}`">Desde</label>
      <input :id="`${idPrefix}-from-${i}`" v-model="w.from" type="time" class="input w-28" required />
      <span class="text-sm text-zinc-500">a</span>
      <label class="sr-only" :for="`${idPrefix}-to-${i}`">Hasta</label>
      <input :id="`${idPrefix}-to-${i}`" v-model="w.to" type="time" class="input w-28" required />
      <AppButton variant="ghost" size="sm" :aria-label="`Quitar horario ${i + 1}`" @click="model.weekly.splice(i, 1)"><Trash2 class="size-4" aria-hidden="true" /></AppButton>
    </div>
    <AppButton variant="secondary" size="sm" @click="addWindow"><Plus class="size-4" aria-hidden="true" /> Agregar horario</AppButton>
  </fieldset>

  <fieldset class="space-y-2">
    <legend class="text-sm font-semibold text-zinc-900">{{ closedLabel }}</legend>
    <div class="flex flex-wrap gap-2">
      <span v-for="d in model.closedDates" :key="d" class="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700">
        {{ formatDate(d) }}
        <button type="button" class="text-zinc-400 hover:text-red-600" :aria-label="`Quitar ${d}`" @click="model.closedDates = model.closedDates.filter((x) => x !== d)">×</button>
      </span>
    </div>
    <div class="flex items-center gap-2">
      <label class="sr-only" :for="`${idPrefix}-closed`">Fecha</label>
      <input :id="`${idPrefix}-closed`" v-model="newDate" type="date" class="input w-44" />
      <AppButton variant="secondary" size="sm" :disabled="!newDate" @click="addDate">Agregar fecha</AppButton>
    </div>
  </fieldset>
</template>
