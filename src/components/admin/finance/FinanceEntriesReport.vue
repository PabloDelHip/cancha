<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Download, ListFilter, X } from 'lucide-vue-next'
import type { FinanceAccountRow, FinanceEntriesFilter, FinanceEntriesPage, FinanceEntryKind, ID, PaymentMethod } from '@/types'
import { financeService, getErrorMessage } from '@/services'
import { useToast } from '@/composables/useToast'
import { formatDate } from '@/utils/format'
import { ENTRY_KIND, entryTitle, formatMoney, METHOD_LABEL } from '@/utils/finance'
import AppButton from '@/components/common/AppButton.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import PageNav from './PageNav.vue'

/**
 * 4D (F10) — movimientos del torneo con filtros (equipo, tipo, método, periodo, estado), paginados,
 * y exportación CSV con EXACTAMENTE los mismos filtros (el servidor aplica el mismo filtro a ambos).
 * Las sumas de lo filtrado (vigentes) cuadran con el CSV.
 */
const props = defineProps<{ tournamentId: ID; accounts: FinanceAccountRow[]; currency: string }>()
const toast = useToast()

const KINDS: { value: FinanceEntryKind | 'FINE'; label: string }[] = [
  { value: 'CHARGE', label: 'Cargos (incluye multas)' },
  { value: 'FINE', label: 'Solo multas' },
  { value: 'PAYMENT', label: 'Pagos' },
  { value: 'DISCOUNT', label: 'Descuentos' },
  { value: 'REFUND', label: 'Devoluciones' },
]
const filters = reactive({ teamId: '', kind: '', method: '', from: '', to: '', status: 'all' })
const page = ref(1)
const data = ref<FinanceEntriesPage | null>(null)
const loading = ref(false)
const error = ref('')
const exporting = ref<'entries' | 'balances' | null>(null)

const active = computed<FinanceEntriesFilter>(() => ({
  teamId: filters.teamId || undefined,
  kind: (filters.kind || undefined) as FinanceEntriesFilter['kind'],
  method: (filters.method || undefined) as PaymentMethod | undefined,
  from: filters.from || undefined,
  to: filters.to || undefined,
  status: filters.status as FinanceEntriesFilter['status'],
}))
const periodError = computed(() => (filters.from && filters.to && filters.from > filters.to ? '«Desde» es posterior a «Hasta».' : ''))
const hasFilters = computed(() => Boolean(filters.teamId || filters.kind || filters.method || filters.from || filters.to || filters.status !== 'all'))

async function load() {
  if (periodError.value) return
  loading.value = true
  error.value = ''
  try {
    data.value = await financeService.entries(props.tournamentId, { ...active.value, page: page.value, limit: 50 })
  } catch (e) {
    error.value = getErrorMessage(e)
  } finally {
    loading.value = false
  }
}
watch(filters, () => {
  page.value = 1
  load()
}, { deep: true })
watch(() => props.tournamentId, load, { immediate: true })
function goTo(p: number) {
  page.value = p
  load()
}
function clear() {
  Object.assign(filters, { teamId: '', kind: '', method: '', from: '', to: '', status: 'all' })
}
async function exportCsv(which: 'entries' | 'balances') {
  if (exporting.value) return
  exporting.value = which
  try {
    await financeService.downloadCsv(props.tournamentId, which, active.value)
  } catch (e) {
    toast.error(getErrorMessage(e))
  } finally {
    exporting.value = null
  }
}
const money = (c: number) => formatMoney(c, props.currency)
const teamName = (id: string) => data.value?.refs.teams[id] ?? props.accounts.find((a) => a.teamId === id)?.teamName ?? 'Equipo'
</script>

<template>
  <section aria-labelledby="entries-report-title" class="space-y-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h3 id="entries-report-title" class="flex items-center gap-2 font-bold"><ListFilter class="size-4" aria-hidden="true" /> Movimientos</h3>
      <div class="flex flex-wrap gap-2">
        <AppButton variant="secondary" size="sm" :loading="exporting === 'entries'" :disabled="Boolean(exporting) || Boolean(periodError)" @click="exportCsv('entries')">
          <Download class="size-4" aria-hidden="true" /> CSV de movimientos{{ hasFilters ? ' (filtrados)' : '' }}
        </AppButton>
        <AppButton variant="secondary" size="sm" :loading="exporting === 'balances'" :disabled="Boolean(exporting)" @click="exportCsv('balances')">
          <Download class="size-4" aria-hidden="true" /> CSV de saldos
        </AppButton>
      </div>
    </div>

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
      <label class="text-sm lg:col-span-2">
        <span class="mb-1 block font-medium text-zinc-700">Equipo</span>
        <select v-model="filters.teamId" class="input">
          <option value="">Todos</option>
          <option v-for="a in accounts" :key="a.teamId" :value="a.teamId">{{ a.teamName ?? 'Equipo' }}</option>
        </select>
      </label>
      <label class="text-sm">
        <span class="mb-1 block font-medium text-zinc-700">Tipo</span>
        <select v-model="filters.kind" class="input">
          <option value="">Todos</option>
          <option v-for="k in KINDS" :key="k.value" :value="k.value">{{ k.label }}</option>
        </select>
      </label>
      <label class="text-sm">
        <span class="mb-1 block font-medium text-zinc-700">Método</span>
        <select v-model="filters.method" class="input">
          <option value="">Todos</option>
          <option v-for="(label, m) in METHOD_LABEL" :key="m" :value="m">{{ label }}</option>
        </select>
      </label>
      <label class="text-sm">
        <span class="mb-1 block font-medium text-zinc-700">Desde</span>
        <input v-model="filters.from" type="date" class="input" />
      </label>
      <label class="text-sm">
        <span class="mb-1 block font-medium text-zinc-700">Hasta</span>
        <input v-model="filters.to" type="date" class="input" />
      </label>
      <label class="text-sm lg:col-span-2">
        <span class="mb-1 block font-medium text-zinc-700">Estado</span>
        <select v-model="filters.status" class="input">
          <option value="all">Vigentes y anulados</option>
          <option value="active">Solo vigentes</option>
          <option value="voided">Solo anulados</option>
        </select>
      </label>
      <div class="flex items-end lg:col-span-4">
        <button v-if="hasFilters" type="button" class="inline-flex h-10 items-center gap-1 text-sm font-semibold text-zinc-600 hover:text-zinc-900" @click="clear">
          <X class="size-4" aria-hidden="true" /> Quitar filtros
        </button>
      </div>
    </div>
    <p v-if="periodError" class="text-sm font-medium text-red-700" role="alert">{{ periodError }}</p>

    <LoadingState v-if="loading && !data" />
    <ErrorState v-else-if="error && !data" :message="error" @retry="load" />
    <template v-else-if="data">
      <p class="tabular text-sm text-zinc-600" role="status">
        {{ data.total.toLocaleString('es-MX') }} movimientos · vigentes: suman {{ money(data.sums.charges) }} en cargos y devoluciones, y {{ money(data.sums.credits) }} en pagos y descuentos.
      </p>
      <EmptyState v-if="!data.data.length" :icon="ListFilter" title="Sin movimientos" :description="hasFilters ? 'Ningún movimiento coincide con los filtros.' : 'Todavía no hay movimientos en este torneo.'" />
      <ul v-else class="divide-y divide-zinc-100 rounded-2xl border border-zinc-200/80 bg-white" :aria-busy="loading">
        <li v-for="e in data.data" :key="e.id" class="flex items-start gap-3 px-4 py-3" :class="e.voidedAt && 'opacity-60'">
          <div class="min-w-0 flex-1">
            <div class="mb-0.5 flex flex-wrap items-center gap-1.5">
              <StatusBadge :label="entryTitle(e)" :tone="ENTRY_KIND[e.kind].tone" />
              <StatusBadge v-if="e.voidedAt" :label="e.replacedBy ? 'Corregido' : 'Anulado'" />
              <StatusBadge v-if="e.replaces" label="Corrección" tone="blue" />
              <span class="text-xs text-zinc-500">{{ formatDate(e.date) }}</span>
            </div>
            <p class="truncate font-semibold text-zinc-900" :class="e.voidedAt && 'line-through'">{{ teamName(e.teamId!) }} · {{ e.concept }}</p>
            <p v-if="e.method || e.reference" class="text-xs text-zinc-500">{{ [e.method ? METHOD_LABEL[e.method] : '', e.reference ? `Ref. ${e.reference}` : ''].filter(Boolean).join(' · ') }}</p>
          </div>
          <p class="tabular shrink-0 text-right font-bold" :class="[ENTRY_KIND[e.kind].sign > 0 ? 'text-red-700' : 'text-pitch-700', e.voidedAt && 'line-through']">
            {{ ENTRY_KIND[e.kind].sign > 0 ? '+' : '−' }}{{ money(e.amount) }}
          </p>
        </li>
      </ul>
      <PageNav v-if="data.pages > 1" :page="data.page" :pages="data.pages" :total="data.total" :limit="data.limit" :busy="loading" @go="goTo" />
    </template>
  </section>
</template>
