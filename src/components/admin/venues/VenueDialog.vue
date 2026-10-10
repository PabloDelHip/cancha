<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import type { Venue } from '@/types'
import { getErrorMessage, venueService } from '@/services'
import { useToast } from '@/composables/useToast'
import BaseModal from '@/components/common/BaseModal.vue'
import AppButton from '@/components/common/AppButton.vue'
import FormField from '@/components/common/FormField.vue'

/** Registrar o editar una sede. Al crearla se pueden escribir sus canchas (una por línea). */
const props = defineProps<{ open: boolean; venue: Venue | null }>()
const emit = defineEmits<{ close: []; saved: [venue: Venue] }>()
const toast = useToast()
const saving = ref(false)
const form = reactive({ name: '', address: '', bufferMinutes: 15, fields: 'Cancha 1' })

watch(
  () => props.open,
  (open) => {
    if (!open) return
    Object.assign(form, { name: props.venue?.name ?? '', address: props.venue?.address ?? '', bufferMinutes: props.venue?.bufferMinutes ?? 15, fields: 'Cancha 1' })
  },
)

async function save() {
  saving.value = true
  try {
    const base = { name: form.name.trim(), address: form.address.trim() || null, bufferMinutes: Number(form.bufferMinutes) }
    const saved = props.venue
      ? await venueService.update(props.venue.id, base)
      : await venueService.create({ ...base, fields: form.fields.split('\n').map((n) => n.trim()).filter(Boolean).map((name) => ({ name })) })
    toast.success(props.venue ? 'Sede actualizada.' : 'Sede registrada.')
    emit('saved', saved)
    emit('close')
  } catch (e) {
    toast.error(getErrorMessage(e))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <BaseModal :open="open" :title="venue ? 'Editar sede' : 'Nueva sede'" description="Tus sedes sirven para todas tus ligas y torneos." @close="saving || emit('close')">
    <form id="venue-form" class="space-y-4" @submit.prevent="save">
      <FormField id="venue-name" label="Nombre" required>
        <input id="venue-name" v-model="form.name" class="input" maxlength="80" required autofocus placeholder="Ej. Deportivo Las Palmas" />
      </FormField>
      <FormField id="venue-address" label="Dirección" hint="Opcional">
        <input id="venue-address" v-model="form.address" class="input" maxlength="200" />
      </FormField>
      <FormField id="venue-buffer" label="Minutos entre partidos" hint="Se suman a la duración del partido para calcular cuándo queda libre la cancha.">
        <input id="venue-buffer" v-model.number="form.bufferMinutes" type="number" inputmode="numeric" min="0" max="120" class="input" />
      </FormField>
      <FormField v-if="!venue" id="venue-fields" label="Canchas" hint="Una por línea. Puedes agregar más después.">
        <textarea id="venue-fields" v-model="form.fields" class="input min-h-20" />
      </FormField>
    </form>
    <template #footer>
      <AppButton variant="secondary" :disabled="saving" @click="emit('close')">Cancelar</AppButton>
      <AppButton type="submit" form="venue-form" :loading="saving">{{ venue ? 'Guardar' : 'Registrar sede' }}</AppButton>
    </template>
  </BaseModal>
</template>
