import { ref } from 'vue'

export interface ConfirmOptions {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'default' | 'danger'
}

/** Pide un texto obligatorio (p. ej. el motivo de una baja o de una excepción). */
export interface AskOptions extends ConfirmOptions {
  label: string
  placeholder?: string
  /** Mínimo de caracteres (por defecto 3, como los motivos del servidor). */
  minLength?: number
}

interface ConfirmState extends ConfirmOptions {
  input?: { label: string; placeholder?: string; minLength: number }
  resolve: (value: string | false) => void
}

const state = ref<ConfirmState | null>(null)

/**
 * Diálogo de confirmación basado en promesas. El componente <ConfirmDialog />
 * se monta una sola vez en App.vue.
 *   if (await confirm({ title: '¿Seguro?' })) { ... }
 *   const reason = await ask({ title: 'Dar de baja', label: 'Motivo' }) // null = canceló
 */
export function useConfirm() {
  function open(options: Omit<ConfirmState, 'resolve'>) {
    state.value?.resolve(false)
    return new Promise<string | false>((resolve) => {
      state.value = { ...options, resolve }
    })
  }

  async function confirm(options: ConfirmOptions): Promise<boolean> {
    return (await open(options)) !== false
  }

  async function ask({ label, placeholder, minLength = 3, ...options }: AskOptions): Promise<string | null> {
    const value = await open({ ...options, input: { label, placeholder, minLength } })
    return value === false ? null : value
  }

  function settle(value: string | boolean) {
    state.value?.resolve(value === true ? '' : value)
    state.value = null
  }

  return { state, confirm, ask, settle }
}
