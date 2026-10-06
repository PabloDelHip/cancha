import { reactive } from 'vue'

/** Errores de validación por campo, con helpers para atributos ARIA. */
export function useFormErrors<K extends string>() {
  const errors = reactive<Record<string, string | undefined>>({}) as Partial<Record<K, string>>

  function set(field: K, message: string | null | false | undefined) {
    if (message) errors[field] = message
    else delete errors[field]
  }
  function clear() {
    for (const key of Object.keys(errors) as K[]) delete errors[key]
  }
  function hasErrors() {
    return Object.keys(errors).length > 0
  }
  /** Atributos para el input asociado a `field`. */
  function aria(field: K, id: string) {
    return errors[field] ? { 'aria-invalid': true, 'aria-describedby': `${id}-error` } : {}
  }

  return { errors, set, clear, hasErrors, aria }
}
