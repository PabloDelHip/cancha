<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { AlertTriangle } from 'lucide-vue-next'
import type { FinanceCategory, FinanceEntry, FinanceEntryInput, FinanceEntryKind, FinanceEntryResult, FinanceRewriteResult, FinanceTotals, ID, Match, PaymentMethod } from '@/types'
import { financeService, getErrorBody, getErrorMessage } from '@/services'
import { useMatchesStore, useRoundsStore, useTeamsStore } from '@/stores'
import { useToast } from '@/composables/useToast'
import { createRequestId } from '@/utils/id'
import { formatDate, toISODate } from '@/utils/format'
import { CATEGORY_LABEL, centsToInput, entryEffect, entryFormErrors, formatMoney, METHOD_LABEL, parseMoneyInput, totalsWithBalance, keptLink } from '@/utils/finance'
import BaseModal from '@/components/common/BaseModal.vue'
import AppButton from '@/components/common/AppButton.vue'
import FormField from '@/components/common/FormField.vue'

/** Qué se registra: los cuatro tipos del libro, con la multa como cargo de categoría FINE. */
export type FinanceAction = FinanceEntryKind | 'FINE'

/**
 * Registrar un cargo, multa, pago o abono, descuento o devolución en la cuenta de un equipo.
 * - Las mismas reglas que el servidor (importe, concepto, método, motivo, fecha, topes), para
 *   avisar antes de enviar; el servidor las vuelve a validar siempre.
 * - Pago que supera el adeudo: muestra cuánto quedará como saldo a favor y exige confirmarlo
 *   (`allowCredit`). Si el saldo cambió mientras tanto, el 409 del servidor trae la cifra real y
 *   se vuelve a pedir la confirmación.
 * - Doble envío: el botón se bloquea mientras se guarda y el `requestId` se genera al abrir y se
 *   conserva en los reintentos, así el servidor nunca registra dos veces el mismo movimiento.
 * - 4D, `correcting`: corregir = anular el original y registrar este reemplazo, enlazados y en una
 *   sola operación del servidor. Se prellena con el original, pide el motivo de la corrección y
 *   valida los topes contra la cuenta SIN el original.
 */
const props = withDefaults(
  defineProps<{ open: boolean; tournamentId: ID; teamId: ID; teamName: string; action: FinanceAction; totals: FinanceTotals; currency: string; correcting?: FinanceEntry | null }>(),
  { correcting: null },
)
const emit = defineEmits<{ close: []; saved: [result: FinanceEntryResult | FinanceRewriteResult] }>()

const matches = useMatchesStore()
const rounds = useRoundsStore()
const teams = useTeamsStore()
const toast = useToast()

const COPY: Record<FinanceAction, { title: string; concept: string; submit: string; done: string }> = {
  CHARGE: { title: 'Agregar cargo', concept: '', submit: 'Agregar cargo', done: 'Cargo registrado.' },
  FINE: { title: 'Registrar multa', concept: 'Multa', submit: 'Registrar multa', done: 'Multa registrada.' },
  PAYMENT: { title: 'Registrar pago o abono', concept: 'Pago', submit: 'Registrar pago', done: 'Pago registrado.' },
  DISCOUNT: { title: 'Aplicar descuento', concept: 'Descuento', submit: 'Aplicar descuento', done: 'Descuento aplicado.' },
  REFUND: { title: 'Registrar devolución', concept: 'Devolución', submit: 'Registrar devolución', done: 'Devolución registrada.' },
}
const CHARGE_CATEGORIES: FinanceCategory[] = ['ENROLLMENT', 'PLAYER_FEE', 'REFEREE', 'OTHER']
const METHODS = Object.keys(METHOD_LABEL) as PaymentMethod[]

const kind = computed<FinanceEntryKind>(() => (props.action === 'FINE' ? 'CHARGE' : props.action))
const copy = computed(() =>
  props.correcting ? { title: 'Corregir movimiento', concept: '', submit: 'Guardar corrección', done: 'Movimiento corregido: el original quedó anulado y enlazado.' } : COPY[props.action],
)
const today = () => toISODate(new Date())

const form = reactive({ amount: '', concept: '', category: 'OTHER' as FinanceCategory, method: '' as PaymentMethod | '', reference: '', reason: '', date: today(), notes: '', matchId: '', playerId: '', confirmCredit: false, correctionReason: '' })
const saving = ref(false)
const submitted = ref(false)
/** Saldo a favor que informó el servidor en un 409 (el saldo cambió desde que se abrió). */
const serverCredit = ref<number | null>(null)
let requestId = createRequestId()

/**
 * Quien está o estuvo en la plantilla del equipo en este torneo, también de un equipo ya quitado
 * (4D: lo calcula el servidor con la misma regla que valida la multa).
 */
const playerOptions = ref<{ id: ID; name: string; current: boolean }[]>([])
async function loadPlayers() {
  try {
    playerOptions.value = (await financeService.finePlayers(props.tournamentId, props.teamId)).players
  } catch {
    playerOptions.value = []
  }
}

watch(
  () => props.open,
  (open) => {
    if (!open) return
    const c = props.correcting
    Object.assign(form, {
      amount: c ? centsToInput(c.amount) : '',
      concept: c?.concept ?? copy.value.concept,
      category: c?.category ?? (props.action === 'FINE' ? 'FINE' : 'OTHER'),
      method: c?.method ?? '',
      reference: c?.reference ?? '',
      reason: c?.reason ?? '',
      date: c?.date ?? today(),
      notes: c?.notes ?? '',
      matchId: c?.matchId ?? '',
      playerId: c?.playerId ?? '',
      confirmCredit: false,
      correctionReason: '',
    })
    submitted.value = false
    if (props.action === 'FINE') loadPlayers()
    serverCredit.value = null
    requestId = createRequestId()
  },
  { immediate: true },
)
// Cambiar el importe invalida una confirmación previa del saldo a favor.
watch(() => form.amount, () => {
  form.confirmCredit = false
  serverCredit.value = null
})

const cents = computed(() => parseMoneyInput(form.amount))
/** La cuenta contra la que se valida: en una corrección, sin el movimiento original. */
const base = computed(() => (props.correcting ? totalsWithBalance(props.totals.balance - entryEffect(props.correcting)) : props.totals))
const errors = computed(() => {
  const e: Record<string, string> = { ...entryFormErrors({ ...form, kind: kind.value }, today(), base.value) }
  if (props.correcting && form.correctionReason.trim().length < 3) e.correctionReason = 'Indica el motivo de la corrección (al menos 3 caracteres).'
  return e
})
const visibleErrors = computed(() => (submitted.value ? errors.value : {}))
/**
 * Saldo a favor que quedaría si crece respecto del actual (0 si no crece): un pago excedente o una
 * corrección que lo aumente exigen confirmarlo. El servidor lo vuelve a calcular con el saldo real.
 */
const credit = computed(() => {
  if (serverCredit.value !== null) return serverCredit.value
  if (!cents.value || (!props.correcting && kind.value !== 'PAYMENT')) return 0
  const sign = kind.value === 'CHARGE' || kind.value === 'REFUND' ? 1 : -1
  const after = Math.max(-(base.value.balance + sign * cents.value), 0)
  return after > props.totals.credit ? after : 0
})
const money = (c: number) => formatMoney(c, props.currency)

const matchOptions = computed(() =>
  matches
    .ofTournament(props.tournamentId)
    .filter((m) => m.status !== 'cancelled' && (m.homeTeamId === props.teamId || m.awayTeamId === props.teamId))
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)),
)
/**
 * 5B: al corregir una multa, el partido o jugador del original se conserva aunque ya no esté en la
 * lista (borrado antes de 5B, partido cancelado o jugador que ya no figura): el servidor acepta el
 * vínculo original tal cual y solo valida uno nuevo. Elegir «Sin …» lo quita.
 */
const keptMatch = computed(() => keptLink(props.correcting?.matchId, matchOptions.value))
const keptPlayer = computed(() => keptLink(props.correcting?.playerId, playerOptions.value))
const matchLabel = (m: Match) => `${rounds.labelOf(props.tournamentId, m.round)} · ${formatDate(m.date)} · vs ${teams.nameOf(m.homeTeamId === props.teamId ? m.awayTeamId : m.homeTeamId)}`

async function save() {
  submitted.value = true
  if (saving.value || Object.keys(errors.value).length || !cents.value) return
  if (credit.value > 0 && !form.confirmCredit) return
  const input: FinanceEntryInput = {
    requestId,
    teamId: props.teamId,
    kind: kind.value,
    amount: cents.value,
    concept: form.concept.trim(),
    date: form.date,
    ...(kind.value === 'CHARGE' ? { category: form.category } : {}),
    ...(form.method && (kind.value === 'PAYMENT' || kind.value === 'REFUND') ? { method: form.method } : {}),
    ...(form.reference.trim() && (kind.value === 'PAYMENT' || kind.value === 'REFUND') ? { reference: form.reference.trim() } : {}),
    ...(form.reason.trim() ? { reason: form.reason.trim() } : {}),
    ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
    ...(props.action === 'FINE' && form.matchId ? { matchId: form.matchId } : {}),
    ...(props.action === 'FINE' && form.playerId ? { playerId: form.playerId } : {}),
    ...(credit.value > 0 && form.confirmCredit ? { allowCredit: true } : {}),
  }
  saving.value = true
  try {
    let result: FinanceEntryResult | FinanceRewriteResult
    if (props.correcting) {
      const { requestId: key, teamId: _team, allowCredit, ...entry } = input
      void _team
      result = await financeService.correct(props.tournamentId, props.correcting.id, { requestId: key, reason: form.correctionReason.trim(), entry, ...(allowCredit ? { allowCredit } : {}) })
    } else {
      result = await financeService.record(props.tournamentId, input)
    }
    toast.success(copy.value.done)
    emit('saved', result)
    emit('close')
  } catch (e) {
    const body = getErrorBody<{ error?: string; creditWouldBe?: number }>(e)
    if ((body?.error === 'PAYMENT_EXCEEDS_BALANCE' || body?.error === 'CREDIT_CONFIRMATION_REQUIRED') && typeof body.creditWouldBe === 'number') {
      // El saldo cambió (otro pago entró antes): se muestra la cifra real y se pide confirmar.
      serverCredit.value = body.creditWouldBe
      form.confirmCredit = false
      toast.error(`Este cambio dejaría ${money(body.creditWouldBe)} a favor del equipo. Revisa y confirma.`)
    } else {
      toast.error(getErrorMessage(e))
    }
  } finally {
    saving.value = false
  }
}

const field = (k: keyof typeof form) => (visibleErrors.value as Record<string, string | undefined>)[k] ?? null
</script>

<template>
  <BaseModal :open="open" :title="copy.title" :description="`${teamName} · debe ${money(totals.due)}${totals.credit ? ` · saldo a favor ${money(totals.credit)}` : ''}`" @close="saving || emit('close')">
    <form id="finance-entry-form" class="space-y-4" novalidate @submit.prevent="save">
      <div class="grid gap-4 sm:grid-cols-2">
        <FormField id="fe-amount" label="Importe" :error="field('amount')" :hint="`En ${currency}, por ejemplo 1500 o 1500.50`" required>
          <input id="fe-amount" v-model="form.amount" class="input tabular" inputmode="decimal" autocomplete="off" placeholder="0.00" :aria-invalid="Boolean(field('amount'))" autofocus />
        </FormField>
        <FormField id="fe-date" label="Fecha" :error="field('date')" required>
          <input id="fe-date" v-model="form.date" type="date" class="input" :max="today()" />
        </FormField>
      </div>

      <FormField v-if="action === 'CHARGE'" id="fe-category" label="Tipo de cargo">
        <select id="fe-category" v-model="form.category" class="input">
          <option v-for="c in CHARGE_CATEGORIES" :key="c" :value="c">{{ CATEGORY_LABEL[c] }}</option>
        </select>
      </FormField>

      <FormField id="fe-concept" label="Concepto" :error="field('concept')" required>
        <input id="fe-concept" v-model="form.concept" class="input" maxlength="200" :placeholder="action === 'CHARGE' ? 'Ej. Arbitraje jornada 3' : ''" />
      </FormField>

      <template v-if="kind === 'PAYMENT' || kind === 'REFUND'">
        <div class="grid gap-4 sm:grid-cols-2">
          <FormField id="fe-method" :label="kind === 'PAYMENT' ? 'Método de pago' : 'Cómo se devolvió'" :error="field('method')" required>
            <select id="fe-method" v-model="form.method" class="input">
              <option value="" disabled>Elige uno</option>
              <option v-for="m in METHODS" :key="m" :value="m">{{ METHOD_LABEL[m] }}</option>
            </select>
          </FormField>
          <FormField id="fe-reference" label="Referencia" hint="Folio o número de transferencia (opcional)">
            <input id="fe-reference" v-model="form.reference" class="input" maxlength="120" />
          </FormField>
        </div>
      </template>

      <template v-if="action === 'FINE'">
        <div class="grid gap-4 sm:grid-cols-2">
          <FormField id="fe-match" label="Partido (opcional)">
            <select id="fe-match" v-model="form.matchId" class="input">
              <option value="">Sin partido</option>
              <option v-for="m in matchOptions" :key="m.id" :value="m.id">{{ matchLabel(m) }}</option>
              <option v-if="keptMatch" :value="keptMatch">El del movimiento original (ya no está en la lista)</option>
            </select>
          </FormField>
          <FormField id="fe-player" label="Jugador (opcional)">
            <select id="fe-player" v-model="form.playerId" class="input">
              <option value="">Sin jugador</option>
              <option v-for="p in playerOptions" :key="p.id" :value="p.id">{{ p.name }}</option>
              <option v-if="keptPlayer" :value="keptPlayer">El del movimiento original (ya no está en la lista)</option>
            </select>
          </FormField>
        </div>
      </template>

      <FormField
        v-if="action === 'FINE' || action === 'DISCOUNT' || action === 'REFUND'"
        id="fe-reason"
        :label="action === 'REFUND' ? 'Motivo (opcional)' : 'Motivo'"
        :error="field('reason')"
        :hint="action === 'REFUND' ? undefined : 'Lo verá el equipo en su estado de cuenta.'"
        :required="action !== 'REFUND'"
      >
        <textarea id="fe-reason" v-model="form.reason" class="input min-h-16" maxlength="500" :placeholder="action === 'FINE' ? 'Ej. Roja directa en la jornada 4' : action === 'DISCOUNT' ? 'Ej. Pronto pago' : ''" />
      </FormField>

      <FormField v-if="correcting" id="fe-correction-reason" label="Motivo de la corrección" :error="field('correctionReason')" hint="El original queda anulado con este motivo y enlazado a la corrección." required>
        <textarea id="fe-correction-reason" v-model="form.correctionReason" class="input min-h-16" maxlength="500" placeholder="Ej. El importe era 1500, no 1000" />
      </FormField>

      <FormField id="fe-notes" label="Nota interna (opcional)" hint="Solo la ven el propietario y los administradores del torneo; el equipo no.">
        <textarea id="fe-notes" v-model="form.notes" class="input min-h-16" maxlength="500" />
      </FormField>

      <div v-if="credit > 0" class="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" role="alert">
        <p class="flex items-start gap-2 font-semibold">
          <AlertTriangle class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            <template v-if="correcting">Con esta corrección quedarán {{ money(credit) }} como saldo a favor del equipo.</template>
            <template v-else>
              <template v-if="totals.due > 0">El pago supera el adeudo de {{ money(totals.due) }}.</template>
              <template v-else>El equipo no tiene adeudo pendiente.</template>
              Quedarán {{ money(credit) }} como saldo a favor del equipo.
            </template>
          </span>
        </p>
        <label class="mt-2 flex items-start gap-2">
          <input v-model="form.confirmCredit" type="checkbox" class="mt-0.5 size-4 accent-pitch-700" />
          <span>Confirmo que {{ correcting ? 'ese saldo a favor quede' : 'el excedente quede como saldo a favor' }}.</span>
        </label>
        <p v-if="submitted && !form.confirmCredit" class="mt-1 text-xs font-medium text-red-700">Confirma el saldo a favor para {{ correcting ? 'guardar la corrección' : 'registrar el pago' }}.</p>
      </div>
    </form>
    <template #footer>
      <AppButton variant="secondary" :disabled="saving" @click="emit('close')">Cancelar</AppButton>
      <AppButton type="submit" form="finance-entry-form" :loading="saving" :disabled="saving">{{ copy.submit }}</AppButton>
    </template>
  </BaseModal>
</template>
