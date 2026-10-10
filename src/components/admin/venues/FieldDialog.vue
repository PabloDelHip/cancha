<script setup lang="ts">
import { ref, watch } from 'vue'
import type { FieldAvailability, Venue, VenueField } from '@/types'
import { getErrorMessage, venueService } from '@/services'
import { useToast } from '@/composables/useToast'
import AvailabilityEditor from './AvailabilityEditor.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import AppButton from '@/components/common/AppButton.vue'
import FormField from '@/components/common/FormField.vue'

/**
 * Agregar o editar una cancha con su disponibilidad: horario semanal (vacío = sin restricción) y
 * fechas cerradas. La disponibilidad solo genera avisos al programar; los choques sí bloquean.
 */
const props = defineProps<{ open: boolean; venue: Venue | null; field: VenueField | null }>()
const emit = defineEmits<{ close: []; saved: [venue: Venue] }>()
const toast = useToast()
const saving = ref(false)
const name = ref('')
const availability = ref<FieldAvailability>({ weekly: [], closedDates: [] })

watch(
  () => props.open,
  (open) => {
    if (!open) return
    name.value = props.field?.name ?? ''
    availability.value = { weekly: props.field?.availability.weekly.map((w) => ({ ...w })) ?? [], closedDates: [...(props.field?.availability.closedDates ?? [])] }
  },
)

async function save() {
  if (!props.venue) return
  saving.value = true
  try {
    const input = { name: name.value.trim(), availability: availability.value }
    const venue = props.field ? await venueService.updateField(props.venue.id, props.field.id, input) : await venueService.addField(props.venue.id, input)
    toast.success(props.field ? 'Cancha actualizada.' : 'Cancha agregada.')
    emit('saved', venue)
    emit('close')
  } catch (e) {
    toast.error(getErrorMessage(e))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <BaseModal :open="open" :title="field ? 'Editar cancha' : 'Nueva cancha'" :description="venue?.name" size="lg" @close="saving || emit('close')">
    <form id="field-form" class="space-y-5" @submit.prevent="save">
      <FormField id="field-name" label="Nombre" required>
        <input id="field-name" v-model="name" class="input" maxlength="60" required autofocus placeholder="Ej. Cancha 2 (pasto sintético)" />
      </FormField>

      <AvailabilityEditor v-model="availability" id-prefix="field" closed-label="Fechas cerradas" />
    </form>
    <template #footer>
      <AppButton variant="secondary" :disabled="saving" @click="emit('close')">Cancelar</AppButton>
      <AppButton type="submit" form="field-form" :loading="saving">{{ field ? 'Guardar' : 'Agregar cancha' }}</AppButton>
    </template>
  </BaseModal>
</template>
