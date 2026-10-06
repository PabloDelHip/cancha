<script setup lang="ts">
import { computed } from 'vue'
import { useConfirm } from '@/composables/useConfirm'
import BaseModal from './BaseModal.vue'

/** Instancia global; se controla con useConfirm(). */
const { state, settle } = useConfirm()
const open = computed(() => state.value !== null)
</script>

<template>
  <BaseModal :open="open" :title="state?.title ?? ''" role="alertdialog" @close="settle(false)">
    <p v-if="state?.message" class="text-sm text-zinc-600">{{ state.message }}</p>
    <template #footer>
      <button type="button" class="btn btn-secondary" @click="settle(false)">{{ state?.cancelLabel ?? 'Cancelar' }}</button>
      <button
        type="button"
        class="btn"
        :class="state?.tone === 'danger' ? 'btn-danger' : 'btn-primary'"
        autofocus
        @click="settle(true)"
      >
        {{ state?.confirmLabel ?? 'Confirmar' }}
      </button>
    </template>
  </BaseModal>
</template>
