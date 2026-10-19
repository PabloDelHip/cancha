<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { AlertTriangle } from 'lucide-vue-next'
import type { FinanceEntry, FinanceRewriteResult, ID } from '@/types'
import { financeService, getErrorBody, getErrorMessage } from '@/services'
import { useToast } from '@/composables/useToast'
import { createRequestId } from '@/utils/id'
import { formatDate } from '@/utils/format'
import { entryTitle, formatMoney } from '@/utils/finance'
import BaseModal from '@/components/common/BaseModal.vue'
import AppButton from '@/components/common/AppButton.vue'
import FormField from '@/components/common/FormField.vue'

/**
 * 4D — anular un movimiento con motivo. El original queda en el estado de cuenta, marcado, y deja
 * de contar en el saldo. Si la anulación deja (más) saldo a favor, el servidor responde 409 con la
 * cifra y aquí se pide la misma confirmación explícita que en un pago excedente. El `requestId` se
 * genera al abrir: un doble envío o un reintento no anulan dos veces.
 */
const props = defineProps<{ open: boolean; tournamentId: ID; entry: FinanceEntry; currency: string }>()
const emit = defineEmits<{ close: []; saved: [result: FinanceRewriteResult] }>()
const toast = useToast()

const reason = ref('')
const saving = ref(false)
const submitted = ref(false)
const creditWouldBe = ref<number | null>(null)
const confirmCredit = ref(false)
let requestId = createRequestId()
watch(
  () => props.open,
  (open) => {
    if (!open) return
    reason.value = ''
    submitted.value = false
    creditWouldBe.value = null
    confirmCredit.value = false
    requestId = createRequestId()
  },
  { immediate: true },
)
const reasonError = computed(() => (submitted.value && reason.value.trim().length < 3 ? 'El motivo es obligatorio (al menos 3 caracteres).' : null))

async function save() {
  submitted.value = true
  if (saving.value || reason.value.trim().length < 3) return
  if (creditWouldBe.value !== null && !confirmCredit.value) return
  saving.value = true
  try {
    const result = await financeService.voidEntry(props.tournamentId, props.entry.id, { requestId, reason: reason.value.trim(), ...(confirmCredit.value ? { allowCredit: true } : {}) })
    toast.success('Movimiento anulado.')
    emit('saved', result)
    emit('close')
  } catch (e) {
    const body = getErrorBody<{ error?: string; creditWouldBe?: number }>(e)
    if (body?.error === 'CREDIT_CONFIRMATION_REQUIRED' && typeof body.creditWouldBe === 'number') {
      creditWouldBe.value = body.creditWouldBe
      confirmCredit.value = false
    } else toast.error(getErrorMessage(e))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <BaseModal :open="open" title="Anular movimiento" role="alertdialog" @close="saving || emit('close')">
    <form id="void-entry-form" class="space-y-4" novalidate @submit.prevent="save">
      <div class="rounded-xl bg-zinc-50 p-3 text-sm">
        <p class="font-semibold text-zinc-900">{{ entryTitle(entry) }} · {{ formatMoney(entry.amount, currency) }}</p>
        <p class="text-zinc-600">{{ entry.concept }} · {{ formatDate(entry.date) }}</p>
      </div>
      <p class="text-sm text-zinc-600">El movimiento seguirá visible en el estado de cuenta, marcado como anulado, y dejará de contar en el saldo. No se puede deshacer: si te equivocas, regístralo de nuevo.</p>
      <FormField id="void-reason" label="Motivo de la anulación" :error="reasonError" required>
        <textarea id="void-reason" v-model="reason" class="input min-h-20" maxlength="500" placeholder="Ej. Se capturó dos veces" autofocus />
      </FormField>
      <div v-if="creditWouldBe !== null" class="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" role="alert">
        <p class="flex items-start gap-2 font-semibold">
          <AlertTriangle class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Al anularlo, el equipo quedará con {{ formatMoney(creditWouldBe, currency) }} de saldo a favor.
        </p>
        <label class="mt-2 flex items-start gap-2">
          <input v-model="confirmCredit" type="checkbox" class="mt-0.5 size-4 accent-pitch-700" />
          <span>Confirmo que quede ese saldo a favor.</span>
        </label>
        <p v-if="submitted && !confirmCredit" class="mt-1 text-xs font-medium text-red-700">Confirma el saldo a favor para anular.</p>
      </div>
    </form>
    <template #footer>
      <AppButton variant="secondary" :disabled="saving" @click="emit('close')">Cancelar</AppButton>
      <AppButton type="submit" form="void-entry-form" variant="danger" :loading="saving" :disabled="saving">Anular movimiento</AppButton>
    </template>
  </BaseModal>
</template>
