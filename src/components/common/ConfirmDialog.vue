<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useConfirm } from '@/composables/useConfirm'
import BaseModal from './BaseModal.vue'

/** Instancia global; se controla con useConfirm() (confirmar o pedir un texto obligatorio). */
const { state, settle } = useConfirm()
const open = computed(() => state.value !== null)
const text = ref('')
const touched = ref(false)
watch(state, () => {
  text.value = ''
  touched.value = false
})
const tooShort = computed(() => !!state.value?.input && text.value.trim().length < state.value.input.minLength)

function accept() {
  if (!state.value?.input) return settle(true)
  touched.value = true
  if (!tooShort.value) settle(text.value.trim())
}
</script>

<template>
  <BaseModal :open="open" :title="state?.title ?? ''" role="alertdialog" @close="settle(false)">
    <p v-if="state?.message" class="text-sm text-zinc-600">{{ state.message }}</p>
    <label v-if="state?.input" class="mt-3 block">
      <span class="mb-1 block text-sm font-medium text-zinc-700">{{ state.input.label }}</span>
      <textarea
        v-model="text"
        rows="2"
        maxlength="300"
        class="input"
        :placeholder="state.input.placeholder"
        :aria-invalid="touched && tooShort"
        autofocus
        @keydown.enter.exact.prevent="accept"
      />
      <span v-if="touched && tooShort" class="mt-1 block text-xs text-red-600">Escribe al menos {{ state.input.minLength }} caracteres.</span>
    </label>
    <template #footer>
      <button type="button" class="btn btn-secondary" @click="settle(false)">{{ state?.cancelLabel ?? 'Cancelar' }}</button>
      <button
        type="button"
        class="btn"
        :class="state?.tone === 'danger' ? 'btn-danger' : 'btn-primary'"
        :autofocus="!state?.input"
        @click="accept"
      >
        {{ state?.confirmLabel ?? 'Confirmar' }}
      </button>
    </template>
  </BaseModal>
</template>
