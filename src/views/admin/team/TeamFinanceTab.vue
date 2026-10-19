<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Printer, Server, Wallet } from 'lucide-vue-next'
import type { TeamFinanceStatement, TeamFinanceStatements } from '@/types'
import { FINANCE_REQUIRES_SERVER, financeService, getErrorMessage, getErrorStatus, USE_MOCKS } from '@/services'
import { useTeamManagement } from '@/composables/useTeamManagement'
import { formatMoney, paymentState } from '@/utils/finance'
import { TOURNAMENT_STATUS } from '@/utils/labels'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import StatCard from '@/components/common/StatCard.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import AccountStatement from '@/components/admin/finance/AccountStatement.vue'
import PageNav from '@/components/admin/finance/PageNav.vue'
import AppButton from '@/components/common/AppButton.vue'

/**
 * 4C (F3b) — estado de cuenta del equipo en cada torneo donde tiene movimientos, en SOLO LECTURA.
 * Lo ven su propietario y sus delegados; el servidor solo envía lo de este equipo y nunca las notas
 * internas del organizador ni quién registró cada movimiento. Para pagar o aclarar algo, el equipo
 * habla con el organizador: Kisokar no procesa pagos.
 * 4D: los movimientos llegan por páginas (por defecto la última) con el saldo inicial de la página;
 * se puede imprimir el estado de cuenta completo.
 */
const { team, teamId } = useTeamManagement()
const data = ref<TeamFinanceStatements | null>(null)
const loading = ref(false)
const error = ref('')
const forbidden = ref(false)
const selected = ref('')
const statement = ref<TeamFinanceStatement | null>(null)
const loadingPage = ref(false)

async function load() {
  if (USE_MOCKS) return
  loading.value = true
  error.value = ''
  try {
    data.value = await financeService.teamStatements(teamId())
    if (!data.value.accounts.some((a) => a.tournament.id === selected.value)) selected.value = data.value.accounts[0]?.tournament.id ?? ''
  } catch (e) {
    forbidden.value = getErrorStatus(e) === 403
    error.value = getErrorMessage(e)
  } finally {
    loading.value = false
  }
}
watch(teamId, load, { immediate: true })

async function loadPage(page?: number) {
  if (!selected.value) return
  loadingPage.value = true
  try {
    statement.value = await financeService.teamStatement(teamId(), selected.value, page)
  } catch (e) {
    error.value = getErrorMessage(e)
  } finally {
    loadingPage.value = false
  }
}
watch(selected, () => loadPage(), { immediate: true })

const account = computed(() => data.value?.accounts.find((a) => a.tournament.id === selected.value) ?? null)
/** Tarjetas del resumen: sin el código de moneda (se indica una vez en el encabezado). */
const card = (c: number) => formatMoney(c, account.value?.currency ?? 'MXN', false)
const statusOf = (s: string) => TOURNAMENT_STATUS[s.toLowerCase() as keyof typeof TOURNAMENT_STATUS]
</script>

<template>
  <EmptyState v-if="USE_MOCKS" :icon="Server" title="Requiere el servidor" :description="`${FINANCE_REQUIRES_SERVER}.`" class="card" />
  <LoadingState v-else-if="loading && !data" />
  <EmptyState v-else-if="forbidden" :icon="Wallet" title="Solo el propietario y los delegados del equipo ven sus pagos" class="card" />
  <ErrorState v-else-if="error && !data" :message="error" @retry="load" />
  <section v-else-if="data" aria-labelledby="team-finance-title" class="space-y-5">
    <div>
      <h2 id="team-finance-title" class="text-xl font-bold">Pagos</h2>
      <p class="text-sm text-zinc-500">Estado de cuenta de {{ team?.name }} en cada torneo, tal como lo registró el organizador. Solo lectura: para pagar o aclarar un movimiento, habla con el organizador.</p>
    </div>

    <EmptyState v-if="!data.accounts.length" :icon="Wallet" title="Sin movimientos" description="Cuando el organizador de un torneo registre cargos o pagos de tu equipo, aparecerán aquí." class="card" />
    <template v-else-if="account">
      <div v-if="data.accounts.length > 1" class="max-w-md">
        <label for="team-finance-tournament" class="mb-1.5 block text-sm font-medium text-zinc-700">Torneo</label>
        <select id="team-finance-tournament" v-model="selected" class="input">
          <option v-for="a in data.accounts" :key="a.tournament.id" :value="a.tournament.id">{{ a.tournament.name }}</option>
        </select>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <h3 class="text-lg font-bold">{{ account.tournament.name }}</h3>
        <AppButton variant="secondary" size="sm" class="ml-auto" :to="{ name: 'team-finance-print', params: { teamId: teamId(), tournamentId: account.tournament.id } }" target="_blank">
          <Printer class="size-4" aria-hidden="true" /> Imprimir
        </AppButton>
        <StatusBadge v-if="statusOf(account.tournament.status)" :label="statusOf(account.tournament.status)!.label" :tone="statusOf(account.tournament.status)!.tone" />
        <StatusBadge v-bind="paymentState(account.totals, account.currency)" />
        <span class="text-sm text-zinc-500">Importes en {{ account.currency }}</span>
      </div>

      <div class="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatCard label="Adeudo" :value="card(account.totals.due)" highlight />
        <StatCard label="Saldo a favor" :value="card(account.totals.credit)" />
        <StatCard label="Cargado" :value="card(account.totals.charged)" />
        <StatCard label="Pagado" :value="card(account.totals.paid)" />
        <StatCard label="Descuentos" :value="card(account.totals.discounted)" />
        <StatCard label="Devoluciones" :value="card(account.totals.refunded)" />
      </div>

      <div class="card p-4">
        <h4 class="mb-2 font-bold">Movimientos</h4>
        <LoadingState v-if="loadingPage && !statement" />
        <template v-else-if="statement">
          <PageNav v-if="statement.pages > 1" :page="statement.page" :pages="statement.pages" :total="statement.total" :limit="statement.limit" :busy="loadingPage" class="mb-3" @go="loadPage" />
          <AccountStatement :entries="statement.entries" :currency="statement.currency" :opening-balance="statement.openingBalance" />
        </template>
      </div>
    </template>
  </section>
</template>
