<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { BadgePercent, ChevronLeft, Gavel, HandCoins, Plus, Printer, Server, Undo2 } from 'lucide-vue-next'
import type { FinanceAccounts, FinanceEntry, FinanceStatement } from '@/types'
import { FINANCE_REQUIRES_SERVER, financeService, getErrorMessage, USE_MOCKS } from '@/services'
import { useTournamentWorkspace } from '@/composables/useTournamentWorkspace'
import { usePageTitle } from '@/composables/usePageTitle'
import { formatDate } from '@/utils/format'
import { ACCOUNT_STATUS, formatMoney, paymentState } from '@/utils/finance'
import AppButton from '@/components/common/AppButton.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import StatCard from '@/components/common/StatCard.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import AccountStatement from '@/components/admin/finance/AccountStatement.vue'
import FinanceEntryDialog, { type FinanceAction } from '@/components/admin/finance/FinanceEntryDialog.vue'
import VoidEntryDialog from '@/components/admin/finance/VoidEntryDialog.vue'
import PageNav from '@/components/admin/finance/PageNav.vue'

/**
 * 4C — estado de cuenta de un equipo en el torneo (organizador): movimientos cronológicos con saldo
 * acumulado, autor y notas internas, y las acciones de registro (con FINANCE_MANAGE). Sirve igual
 * para equipos retirados o quitados y con el torneo finalizado.
 * 4D: paginado (por defecto la última página; el saldo inicial de cada página cuadra el acumulado),
 * anular y corregir por renglón, e impresión del estado de cuenta completo.
 */
const props = defineProps<{ id: string; teamId: string }>()
const { can } = useTournamentWorkspace(() => props.id)
const canManage = computed(() => can('FINANCE_MANAGE'))

const statement = ref<FinanceStatement | null>(null)
const row = ref<FinanceAccounts['accounts'][number] | null>(null)
const loading = ref(false)
const error = ref('')
const action = ref<FinanceAction | null>(null)
const correcting = ref<FinanceEntry | null>(null)
const voiding = ref<FinanceEntry | null>(null)
/** Página abierta; null = la última (lo más reciente). */
const page = ref<number | null>(null)
usePageTitle(() => (row.value?.teamName ? `${row.value.teamName} · Finanzas` : undefined))

async function load() {
  if (USE_MOCKS) return
  loading.value = true
  error.value = ''
  try {
    // El estado de cuenta trae los movimientos; la lista, el nombre y el estado de inscripción.
    const [s, list] = await Promise.all([financeService.statement(props.id, props.teamId, page.value ?? undefined), financeService.accounts(props.id)])
    statement.value = s
    row.value = list.accounts.find((a) => a.teamId === props.teamId) ?? null
  } catch (e) {
    error.value = getErrorMessage(e)
  } finally {
    loading.value = false
  }
}
watch(() => [props.id, props.teamId], () => {
  page.value = null
  load()
}, { immediate: true })
function goTo(p: number) {
  page.value = p
  load()
}
/** Tras registrar, anular o corregir: a la última página, donde aparece lo nuevo. */
function saved() {
  page.value = null
  load()
}
const actionOf = (e: FinanceEntry): FinanceAction => (e.kind === 'CHARGE' && e.category === 'FINE' ? 'FINE' : e.kind)
function startCorrection(e: FinanceEntry) {
  correcting.value = e
  action.value = actionOf(e)
}
function closeEntryDialog() {
  action.value = null
  correcting.value = null
}

const currency = computed(() => statement.value?.currency ?? 'MXN')
/** Tarjetas del resumen: sin el código de moneda (se indica una vez en el encabezado). */
const card = (c: number) => formatMoney(c, currency.value, false)
const teamName = computed(() => row.value?.teamName ?? 'Equipo')
const state = computed(() => (statement.value ? paymentState(statement.value.totals, currency.value) : null))

const ACTIONS: { action: FinanceAction; label: string; icon: typeof Plus; primary?: boolean }[] = [
  { action: 'PAYMENT', label: 'Registrar pago', icon: HandCoins, primary: true },
  { action: 'CHARGE', label: 'Cargo', icon: Plus },
  { action: 'FINE', label: 'Multa', icon: Gavel },
  { action: 'DISCOUNT', label: 'Descuento', icon: BadgePercent },
  { action: 'REFUND', label: 'Devolución', icon: Undo2 },
]
</script>

<template>
  <div>
    <RouterLink :to="{ name: 'admin-tournament-finance', params: { id } }" class="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-zinc-500 hover:text-zinc-900">
      <ChevronLeft class="size-4" aria-hidden="true" /> Finanzas
    </RouterLink>

    <EmptyState v-if="USE_MOCKS" :icon="Server" title="Requiere el servidor" :description="`${FINANCE_REQUIRES_SERVER}.`" class="card" />
    <LoadingState v-else-if="loading && !statement" />
    <ErrorState v-else-if="error && !statement" :message="error" @retry="load" />
    <section v-else-if="statement" aria-labelledby="account-title" class="space-y-5">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div class="min-w-0">
          <div class="mb-1 flex flex-wrap items-center gap-2">
            <StatusBadge v-if="state" :label="state.label" :tone="state.tone" />
            <StatusBadge
              v-if="row && ACCOUNT_STATUS[row.status]"
              :label="row.status === 'WITHDRAWN' && row.withdrawnAt ? `Retirado el ${formatDate(row.withdrawnAt.slice(0, 10))}` : ACCOUNT_STATUS[row.status]!.label"
              :tone="ACCOUNT_STATUS[row.status]!.tone"
            />
          </div>
          <h2 id="account-title" class="text-xl font-bold break-words">Estado de cuenta · {{ teamName }}</h2>
          <p class="text-sm text-zinc-500">Importes en {{ currency }}.</p>
        </div>
        <AppButton variant="secondary" :to="{ name: 'finance-print', params: { tournamentId: id, teamId } }" target="_blank">
          <Printer class="size-4" aria-hidden="true" /> Imprimir
        </AppButton>
      </div>

      <div v-if="canManage" class="flex flex-wrap gap-2" role="group" aria-label="Registrar movimiento">
        <AppButton v-for="a in ACTIONS" :key="a.action" :variant="a.primary ? 'primary' : 'secondary'" @click="action = a.action">
          <component :is="a.icon" class="size-4" aria-hidden="true" /> {{ a.label }}
        </AppButton>
      </div>

      <div class="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatCard label="Adeudo" :value="card(statement.totals.due)" highlight />
        <StatCard label="Saldo a favor" :value="card(statement.totals.credit)" />
        <StatCard label="Cargado" :value="card(statement.totals.charged)" />
        <StatCard label="Pagado" :value="card(statement.totals.paid)" />
        <StatCard label="Descuentos" :value="card(statement.totals.discounted)" />
        <StatCard label="Devoluciones" :value="card(statement.totals.refunded)" />
      </div>

      <div class="card p-4">
        <h3 class="mb-2 font-bold">Movimientos</h3>
        <PageNav v-if="statement.pages > 1" :page="statement.page" :pages="statement.pages" :total="statement.total" :limit="statement.limit" :busy="loading" class="mb-3" @go="goTo" />
        <AccountStatement
          :entries="statement.entries"
          :currency="currency"
          :users="statement.refs.users"
          :opening-balance="statement.openingBalance"
          :manage="canManage"
          @void="voiding = $event"
          @correct="startCorrection"
        />
      </div>
    </section>

    <FinanceEntryDialog
      v-if="statement && action"
      :open="Boolean(action)"
      :tournament-id="id"
      :team-id="teamId"
      :team-name="teamName"
      :action="action"
      :totals="statement.totals"
      :currency="currency"
      :correcting="correcting"
      @close="closeEntryDialog"
      @saved="saved"
    />
    <VoidEntryDialog v-if="statement && voiding" :open="Boolean(voiding)" :tournament-id="id" :entry="voiding" :currency="currency" @close="voiding = null" @saved="saved" />
  </div>
</template>
