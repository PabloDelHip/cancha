<script setup lang="ts">
import { computed } from 'vue'
import { Ban, PencilLine, Receipt } from 'lucide-vue-next'
import type { FinanceEntry } from '@/types'
import { formatDate } from '@/utils/format'
import { ENTRY_KIND, entryTitle, formatMoney, METHOD_LABEL, runningBalances } from '@/utils/finance'
import { ROLE_LABEL } from '@/utils/labels'
import EmptyState from '@/components/common/EmptyState.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'

/**
 * Estado de cuenta: movimientos en orden cronológico con su saldo acumulado. Lo usan el
 * organizador (con autor, notas internas y detalle de anulaciones) y el equipo (`users` ausente:
 * sin autor, notas ni motivos de anulación; el servidor tampoco se los envía). Con paginación,
 * `openingBalance` es el saldo antes del primer renglón, así el acumulado cuadra en cada página.
 * En móvil cada movimiento es una tarjeta; en escritorio, una tabla. `printable` quita acciones.
 */
const props = withDefaults(
  defineProps<{ entries: FinanceEntry[]; currency: string; users?: Record<string, string>; openingBalance?: number; manage?: boolean; printable?: boolean }>(),
  { users: undefined, openingBalance: 0, manage: false, printable: false },
)
const emit = defineEmits<{ void: [entry: FinanceEntry]; correct: [entry: FinanceEntry] }>()
const internal = computed(() => Boolean(props.users))
const roleText = (role: string | null | undefined) => (role ? ` (${(ROLE_LABEL as Record<string, string>)[role]?.toLowerCase() ?? role})` : '')
const who = (id: string | null | undefined) => (id ? (props.users?.[id] ?? 'Usuario') : 'Usuario')

const rows = computed(() => {
  const balances = runningBalances(props.entries).map((b) => b + props.openingBalance)
  return props.entries.map((e, i) => {
    const voided = Boolean(e.voidedAt || e.voided)
    const author = internal.value && e.recordedBy ? `${who(e.recordedBy)}${roleText(e.recordedRole)}` : null
    const details = [e.method ? METHOD_LABEL[e.method] : null, e.reference ? `Ref. ${e.reference}` : null].filter(Boolean).join(' · ')
    const replaced = Boolean(e.replacedBy) || e.correction === 'REPLACED'
    const replacement = Boolean(e.replaces) || e.correction === 'REPLACEMENT'
    const voidLine = voided
      ? internal.value
        ? `${replaced ? 'Corregido' : 'Anulado'} el ${e.voidedAt ? formatDate(e.voidedAt.slice(0, 10)) : ''} por ${who(e.voidedBy)}${roleText(e.voidedRole)}${e.voidReason ? ` · Motivo: ${e.voidReason}` : ''}`
        : replaced
          ? 'Corregido: lo reemplaza un movimiento posterior'
          : 'Anulado: no cuenta en el saldo'
      : null
    return { e, balance: balances[i] ?? 0, author, details, voided, replaced, replacement, voidLine, actions: props.manage && !props.printable && !voided }
  })
})
const money = (cents: number) => formatMoney(cents, props.currency)
/** Saldo acumulado: positivo debe; negativo es saldo a favor. */
const balanceText = (b: number) => (b > 0 ? money(b) : b < 0 ? `${money(-b)} a favor` : money(0))
const amountClass = (kind: FinanceEntry['kind']) => (ENTRY_KIND[kind].sign > 0 ? 'text-red-700' : 'text-pitch-700')
</script>

<template>
  <EmptyState v-if="!entries.length" :icon="Receipt" title="Sin movimientos" description="Aquí aparecerán los cargos, pagos, descuentos y devoluciones de la cuenta." />
  <div v-else>
    <!-- Móvil -->
    <ul class="divide-y divide-zinc-100 md:hidden" :class="printable && 'print:hidden'">
      <li v-for="r in rows" :key="r.e.id" class="py-3">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0" :class="r.voided && 'opacity-60'">
            <div class="mb-1 flex flex-wrap items-center gap-1.5">
              <StatusBadge :label="entryTitle(r.e)" :tone="ENTRY_KIND[r.e.kind].tone" />
              <StatusBadge v-if="r.voided" :label="r.replaced ? 'Corregido' : 'Anulado'" />
              <StatusBadge v-if="r.replacement" label="Corrección" tone="blue" />
              <span class="text-xs text-zinc-500">{{ formatDate(r.e.date) }}</span>
            </div>
            <p class="font-semibold break-words text-zinc-900" :class="r.voided && 'line-through'">{{ r.e.concept }}</p>
            <p v-if="r.e.reason" class="text-sm break-words text-zinc-600">Motivo: {{ r.e.reason }}</p>
            <p v-if="r.details" class="text-xs text-zinc-500">{{ r.details }}</p>
            <p v-if="r.author" class="text-xs text-zinc-500">Registró {{ r.author }}</p>
            <p v-if="r.voidLine" class="text-xs font-medium break-words text-zinc-700">{{ r.voidLine }}</p>
            <p v-if="internal && r.e.notes" class="mt-1 rounded-lg bg-amber-50 px-2 py-1 text-xs break-words text-amber-900">Nota interna: {{ r.e.notes }}</p>
          </div>
          <div class="shrink-0 text-right">
            <p class="tabular font-bold" :class="[amountClass(r.e.kind), r.voided && 'line-through opacity-60']">{{ ENTRY_KIND[r.e.kind].sign > 0 ? '+' : '−' }}{{ money(r.e.amount) }}</p>
            <p class="tabular text-xs text-zinc-500">Saldo {{ balanceText(r.balance) }}</p>
          </div>
        </div>
        <div v-if="r.actions" class="mt-2 flex gap-2">
          <button type="button" class="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50" @click="emit('correct', r.e)">
            <PencilLine class="size-3.5" aria-hidden="true" /> Corregir
          </button>
          <button type="button" class="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-50" @click="emit('void', r.e)">
            <Ban class="size-3.5" aria-hidden="true" /> Anular
          </button>
        </div>
      </li>
    </ul>

    <!-- Escritorio (y siempre al imprimir) -->
    <table class="hidden w-full text-sm md:table" :class="printable && 'print:table'">
      <thead>
        <tr class="border-b border-zinc-200 text-left text-xs tracking-wider text-zinc-500 uppercase">
          <th scope="col" class="py-2 pr-3 font-semibold">Fecha</th>
          <th scope="col" class="py-2 pr-3 font-semibold">Movimiento</th>
          <th scope="col" class="py-2 pr-3 font-semibold">Concepto</th>
          <th scope="col" class="py-2 pr-3 text-right font-semibold">Cargo</th>
          <th scope="col" class="py-2 pr-3 text-right font-semibold">Abono</th>
          <th scope="col" class="py-2 text-right font-semibold">Saldo</th>
          <th v-if="manage && !printable" scope="col" class="py-2 pl-3"><span class="sr-only">Acciones</span></th>
        </tr>
      </thead>
      <tbody class="divide-y divide-zinc-100">
        <tr v-if="openingBalance" class="text-zinc-500">
          <td colspan="5" class="py-2 pr-3 text-xs">Saldo de los movimientos anteriores</td>
          <td class="tabular py-2 text-right text-xs font-semibold whitespace-nowrap">{{ balanceText(openingBalance) }}</td>
          <td v-if="manage && !printable" />
        </tr>
        <tr v-for="r in rows" :key="r.e.id" class="align-top break-inside-avoid">
          <td class="py-2.5 pr-3 whitespace-nowrap text-zinc-600" :class="r.voided && 'opacity-60'">{{ formatDate(r.e.date) }}</td>
          <td class="py-2.5 pr-3" :class="r.voided && 'opacity-60'">
            <div class="flex flex-wrap gap-1">
              <StatusBadge :label="entryTitle(r.e)" :tone="ENTRY_KIND[r.e.kind].tone" />
              <StatusBadge v-if="r.voided" :label="r.replaced ? 'Corregido' : 'Anulado'" />
              <StatusBadge v-if="r.replacement" label="Corrección" tone="blue" />
            </div>
          </td>
          <td class="py-2.5 pr-3">
            <div :class="r.voided && 'opacity-60'">
              <p class="font-semibold break-words text-zinc-900" :class="r.voided && 'line-through'">{{ r.e.concept }}</p>
              <p v-if="r.e.reason" class="break-words text-zinc-600">Motivo: {{ r.e.reason }}</p>
              <p v-if="r.details" class="text-xs text-zinc-500">{{ r.details }}</p>
              <p v-if="r.author" class="text-xs text-zinc-500">Registró {{ r.author }}</p>
            </div>
            <p v-if="r.voidLine" class="text-xs font-medium break-words text-zinc-700">{{ r.voidLine }}</p>
            <p v-if="internal && r.e.notes && !printable" class="mt-1 rounded-lg bg-amber-50 px-2 py-1 text-xs break-words text-amber-900">Nota interna: {{ r.e.notes }}</p>
          </td>
          <td class="tabular py-2.5 pr-3 text-right whitespace-nowrap text-red-700" :class="r.voided && 'line-through opacity-60'">{{ ENTRY_KIND[r.e.kind].sign > 0 ? money(r.e.amount) : '' }}</td>
          <td class="tabular py-2.5 pr-3 text-right whitespace-nowrap text-pitch-700" :class="r.voided && 'line-through opacity-60'">{{ ENTRY_KIND[r.e.kind].sign < 0 ? money(r.e.amount) : '' }}</td>
          <td class="tabular py-2.5 text-right font-semibold whitespace-nowrap" :class="r.balance < 0 ? 'text-sky-800' : 'text-zinc-900'">{{ balanceText(r.balance) }}</td>
          <td v-if="manage && !printable" class="py-2 pl-3 text-right whitespace-nowrap">
            <template v-if="r.actions">
              <button type="button" class="inline-flex size-9 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100" :aria-label="`Corregir ${r.e.concept}`" title="Corregir" @click="emit('correct', r.e)">
                <PencilLine class="size-4" aria-hidden="true" />
              </button>
              <button type="button" class="inline-flex size-9 items-center justify-center rounded-lg text-red-700 hover:bg-red-50" :aria-label="`Anular ${r.e.concept}`" title="Anular" @click="emit('void', r.e)">
                <Ban class="size-4" aria-hidden="true" />
              </button>
            </template>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
