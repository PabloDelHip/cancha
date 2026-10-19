<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Printer } from 'lucide-vue-next'
import type { FinanceEntry, FinanceTotals } from '@/types'
import { financeService, getErrorMessage, tournamentService, USE_MOCKS, FINANCE_REQUIRES_SERVER } from '@/services'
import { usePageTitle } from '@/composables/usePageTitle'
import { formatDate, toISODate } from '@/utils/format'
import { formatMoney } from '@/utils/finance'
import AppButton from '@/components/common/AppButton.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import BrandLogo from '@/components/layout/BrandLogo.vue'
import AccountStatement from '@/components/admin/finance/AccountStatement.vue'

/**
 * 4D (F10) — estado de cuenta imprimible (el navegador lo guarda como PDF). Sin menús del panel:
 * encabezado, totales y TODOS los movimientos (se piden por páginas). `team` = la vista del equipo
 * (sin autor, notas ni motivos internos: la misma respuesta del servidor que su pestaña Pagos).
 * Documento informativo: Kisokar no emite comprobantes fiscales.
 */
const props = defineProps<{ tournamentId: string; teamId: string; team?: boolean }>()
const PAGE = 500

const loading = ref(true)
const error = ref('')
const entries = ref<FinanceEntry[]>([])
const totals = ref<FinanceTotals | null>(null)
const currency = ref('MXN')
const users = ref<Record<string, string> | undefined>(undefined)
const teamName = ref('')
const tournamentName = ref('')
usePageTitle(() => (teamName.value ? `Estado de cuenta · ${teamName.value}` : 'Estado de cuenta'))

onMounted(async () => {
  if (USE_MOCKS) {
    error.value = FINANCE_REQUIRES_SERVER
    loading.value = false
    return
  }
  try {
    if (props.team) {
      for (let page = 1, pages = 1; page <= pages; page++) {
        const r = await financeService.teamStatement(props.teamId, props.tournamentId, page, PAGE)
        pages = r.pages
        entries.value.push(...r.entries)
        totals.value = r.totals
        currency.value = r.currency
        tournamentName.value = r.tournament.name
        teamName.value = r.team.name
      }
    } else {
      const users_: Record<string, string> = {}
      for (let page = 1, pages = 1; page <= pages; page++) {
        const r = await financeService.statement(props.tournamentId, props.teamId, page, PAGE)
        pages = r.pages
        entries.value.push(...r.entries)
        Object.assign(users_, r.refs.users)
        totals.value = r.totals
        currency.value = r.currency
      }
      users.value = users_
      const list = await financeService.accounts(props.tournamentId)
      teamName.value = list.accounts.find((a) => a.teamId === props.teamId)?.teamName ?? 'Equipo'
      tournamentName.value = (await tournamentService.get(props.tournamentId)).name
    }
  } catch (e) {
    error.value = getErrorMessage(e)
  } finally {
    loading.value = false
  }
})

const money = (c: number) => formatMoney(c, currency.value)
const print = () => window.print()
const issued = formatDate(toISODate(new Date()), 'long')
const rows = computed(() =>
  totals.value
    ? [
        ['Cargado', totals.value.charged],
        ['Pagado', totals.value.paid],
        ['Descuentos', totals.value.discounted],
        ['Devoluciones', totals.value.refunded],
      ]
    : [],
)
</script>

<template>
  <main class="mx-auto max-w-4xl bg-white px-4 py-6 text-zinc-900 print:max-w-none print:p-0">
    <LoadingState v-if="loading" />
    <ErrorState v-else-if="error" :message="error" />
    <template v-else-if="totals">
      <div class="mb-4 flex justify-end print:hidden">
        <AppButton @click="print"><Printer class="size-4" aria-hidden="true" /> Imprimir o guardar PDF</AppButton>
      </div>
      <header class="mb-5 flex items-start justify-between gap-4 border-b border-zinc-200 pb-4">
        <div class="min-w-0">
          <p class="text-xs font-semibold tracking-wider text-zinc-500 uppercase">Estado de cuenta</p>
          <h1 class="text-2xl font-bold break-words">{{ teamName }}</h1>
          <p class="text-sm text-zinc-600">{{ tournamentName }} · Emitido el {{ issued }} · Importes en {{ currency }}</p>
        </div>
        <BrandLogo tone="dark" class="shrink-0" />
      </header>
      <section class="mb-5 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3" aria-label="Totales">
        <p v-for="[label, value] in rows" :key="label" class="flex justify-between gap-2 border-b border-zinc-100 py-1">
          <span class="text-zinc-600">{{ label }}</span><span class="tabular font-semibold">{{ money(value as number) }}</span>
        </p>
        <p class="flex justify-between gap-2 border-b border-zinc-300 py-1 font-bold">
          <span>{{ totals.credit > 0 ? 'Saldo a favor' : 'Saldo pendiente' }}</span><span class="tabular">{{ money(totals.credit > 0 ? totals.credit : totals.due) }}</span>
        </p>
      </section>
      <AccountStatement :entries="entries" :currency="currency" :users="users" printable />
      <p class="mt-6 text-xs text-zinc-500">
        Documento informativo generado con Kisokar. No es un comprobante fiscal. Los movimientos anulados aparecen tachados y no cuentan en el saldo.
      </p>
    </template>
  </main>
</template>
