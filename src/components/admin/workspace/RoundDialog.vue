<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import type { ID } from '@/types'
import { useRoundsStore, type RoundView } from '@/stores'
import { useToast } from '@/composables/useToast'
import { getErrorMessage } from '@/services'
import BaseModal from '@/components/common/BaseModal.vue'
import AppButton from '@/components/common/AppButton.vue'
import FormField from '@/components/common/FormField.vue'

/** Crear una jornada nueva (vacía) o editar el nombre/fecha de una existente. */
const props = defineProps<{ open: boolean; tournamentId: ID; round: RoundView | null; nextNumber: number }>()
const emit = defineEmits<{ close: []; saved: [number: number] }>()

const rounds = useRoundsStore()
const toast = useToast()
const form = reactive({ name: '', date: '' })
const saving = ref(false)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    form.name = props.round?.customName ?? ''
    form.date = props.round?.record?.date ?? ''
  },
)

async function save() {
  const number = props.round?.number ?? props.nextNumber
  saving.value = true
  try {
    await rounds.save(props.tournamentId, number, { name: form.name.trim() || null, date: form.date || null })
    toast.success(props.round ? 'Jornada actualizada.' : `Jornada ${number} creada. Agrega sus partidos.`)
    emit('saved', number)
    emit('close')
  } catch (e) {
    toast.error(getErrorMessage(e))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <BaseModal
    :open="open"
    :title="round ? `Editar ${round.label}` : `Nueva jornada ${nextNumber}`"
    description="La jornada agrupa los partidos de una fecha del torneo. Cada partido tiene su propia fecha y hora."
    @close="saving || emit('close')"
  >
    <form id="round-form" class="space-y-4" @submit.prevent="save">
      <FormField id="round-name" label="Nombre" hint="Opcional. Si lo dejas vacío se muestra el número.">
        <input id="round-name" v-model="form.name" class="input" maxlength="60" :placeholder="`Jornada ${round?.number ?? nextNumber}`" autofocus />
      </FormField>
      <FormField id="round-date" label="Fecha de referencia" hint="Opcional. Se propone al programar partidos en esta jornada.">
        <input id="round-date" v-model="form.date" type="date" class="input" />
      </FormField>
    </form>
    <template #footer>
      <AppButton variant="secondary" :disabled="saving" @click="emit('close')">Cancelar</AppButton>
      <AppButton type="submit" form="round-form" :loading="saving">{{ round ? 'Guardar' : 'Crear jornada' }}</AppButton>
    </template>
  </BaseModal>
</template>
