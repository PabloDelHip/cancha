import { ref } from 'vue'

export interface ConfirmOptions {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'default' | 'danger'
}

interface ConfirmState extends ConfirmOptions {
  resolve: (value: boolean) => void
}

const state = ref<ConfirmState | null>(null)

/**
 * Diálogo de confirmación basado en promesas. El componente <ConfirmDialog />
 * se monta una sola vez en App.vue.
 *   if (await confirm({ title: '¿Seguro?' })) { ... }
 */
export function useConfirm() {
  function confirm(options: ConfirmOptions): Promise<boolean> {
    state.value?.resolve(false)
    return new Promise((resolve) => {
      state.value = { ...options, resolve }
    })
  }

  function settle(value: boolean) {
    state.value?.resolve(value)
    state.value = null
  }

  return { state, confirm, settle }
}
