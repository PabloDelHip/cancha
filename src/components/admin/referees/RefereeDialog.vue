<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import type { FieldAvailability, Referee } from '@/types'
import { getErrorMessage, refereeService } from '@/services'
import { useToast } from '@/composables/useToast'
import BaseModal from '@/components/common/BaseModal.vue'
import AppButton from '@/components/common/AppButton.vue'
import FormField from '@/components/common/FormField.vue'
import AvailabilityEditor from '@/components/admin/venues/AvailabilityEditor.vue'

/** Registrar o editar un árbitro. Teléfono y correo solo los ve el organizador. */
const props = defineProps<{ open: boolean; referee: Referee | null }>()
const emit = defineEmits<{ close: []; saved: [referee: Referee] }>()
const toast = useToast()
const saving = ref(false)
const form = reactive({ firstName: '', lastName: '', phone: '', email: '' })
const availability = ref<FieldAvailability>({ weekly: [], closedDates: [] })

watch(
  () => props.open,
  (open) => {
    if (!open) return
    const r = props.referee
    Object.assign(form, { firstName: r?.firstName ?? '', lastName: r?.lastName ?? '', phone: r?.phone ?? '', email: r?.email ?? '' })
    availability.value = { weekly: r?.availability.weekly.map((w) => ({ ...w })) ?? [], closedDates: [...(r?.availability.closedDates ?? [])] }
  },
)

async function save() {
  saving.value = true
  try {
    const input = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      availability: availability.value,
    }
    const saved = props.referee ? await refereeService.update(props.referee.id, input) : await refereeService.create(input)
    toast.success(props.referee ? 'Árbitro actualizado.' : 'Árbitro registrado.')
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
  <BaseModal :open="open" :title="referee ? 'Editar árbitro' : 'Nuevo árbitro'" description="Sirve para todas tus ligas y torneos." size="lg" @close="saving || emit('close')">
    <form id="referee-form" class="space-y-5" @submit.prevent="save">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField id="ref-first" label="Nombre" required>
          <input id="ref-first" v-model="form.firstName" class="input" maxlength="60" required autofocus />
        </FormField>
        <FormField id="ref-last" label="Apellidos" required>
          <input id="ref-last" v-model="form.lastName" class="input" maxlength="60" required />
        </FormField>
        <FormField id="ref-phone" label="Teléfono" hint="Privado: no se publica">
          <input id="ref-phone" v-model="form.phone" type="tel" inputmode="tel" class="input" maxlength="30" />
        </FormField>
        <FormField id="ref-email" label="Correo" hint="Privado: no se publica">
          <input id="ref-email" v-model="form.email" type="email" class="input" maxlength="120" />
        </FormField>
      </div>
      <AvailabilityEditor v-model="availability" id-prefix="ref" />
    </form>
    <template #footer>
      <AppButton variant="secondary" :disabled="saving" @click="emit('close')">Cancelar</AppButton>
      <AppButton type="submit" form="referee-form" :loading="saving">{{ referee ? 'Guardar' : 'Registrar árbitro' }}</AppButton>
    </template>
  </BaseModal>
</template>
