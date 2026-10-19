<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronRight, Receipt, Server, Wallet } from 'lucide-vue-next'
import type { FinanceAccounts } from '@/types'
import { FINANCE_REQUIRES_SERVER, financeService, getErrorMessage, USE_MOCKS } from '@/services'
import { useTournamentWorkspace } from '@/composables/useTournamentWorkspace'
import { useConfirm } from '@/composables/useConfirm'
import { useToast } from '@/composables/useToast'
import { formatDate, plural } from '@/utils/format'
import { ACCOUNT_STATUS, CATEGORY_LABEL, formatMoney, METHOD_LABEL, paymentState } from '@/utils/finance'
import AppButton from '@/components/common/AppButton.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import StatCard from '@/components/common/StatCard.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import FinanceEntriesReport from '@/components/admin/finance/FinanceEntriesReport.vue'

/**
 * 4C — Finanzas del torneo: resumen (cargado, pagado, descuentos, devoluciones, adeudo y saldo a
 * favor) y cuentas por equipo, incluidos los retirados o quitados que tengan movimientos. Solo
 * propietario y administradores (FINANCE_VIEW; registrar exige FINANCE_MANAGE). Funciona también
 * con el torneo finalizado: los cobros siguen después del cierre y no tocan nada deportivo.
 * Kisokar solo registra: no procesa pagos.
 * 4D: desglose por categoría y método, y la vista «Movimientos» (filtros, paginación y CSV).
 */
const props = defineProps<{ id: string }>()
const { tournament, can } = useTournamentWorkspace(() => props.id)
const { confirm } = useConfirm()
const toast = useToast()

const data = ref<FinanceAccounts | null>(null)
const loading = ref(false)
const error = ref('')
const generating = ref(false)
const canManage = computed(() => can('FINANCE_MANAGE'))
/** Vista: cuentas (por defecto) o movimientos; vive en la URL para poder volver a ella. */
const route = useRoute()
const router = useRouter()
const view = computed(() => (route.query.vista === 'movimientos' ? 'entries' : 'accounts'))
const setView = (v: 'accounts' | 'entries') => router.replace({ query: { ...route.query, vista: v === 'entries' ? 'movimientos' : undefined } })

async function load() {
  if (USE_MOCKS) return
  loading.value = true
  error.value = ''
  try {
    data.value = await financeService.accounts(props.id)
  } catch (e) {
    error.value = getErrorMessage(e)
  } finally {
    loading.value = false
  }
}
watch(() => props.id, load, { immediate: true })

const currency = computed(() => data.value?.currency ?? 'MXN')
const money = (c: number) => formatMoney(c, currency.value)
/** Tarjetas del resumen: sin el código de moneda (se indica una vez en el encabezado). */
const card = (c: number) => formatMoney(c, currency.value, false)
/** Cuota por equipo configurada en la información del torneo (null = sin cuota o gratuita). */
const fee = computed(() => {
  const e = tournament.value?.information?.enrollment
  return e && e.paymentMode !== 'free' && e.teamFee && e.teamFee > 0 ? Math.round(e.teamFee * 100) : null
})

async function generate() {
  if (generating.value || !fee.value) return
  const ok = await confirm({
    title: 'Generar cargos de inscripción',
    message: `Se cargará la cuota de ${money(fee.value)} a cada equipo inscrito (no retirado) que aún no tenga su cargo de inscripción. Los cargos que ya existen no cambian, y puedes repetirlo cuando se inscriban más equipos.`,
    confirmLabel: 'Generar cargos',
  })
  if (!ok) return
  generating.value = true
  try {
    const res = await financeService.generateEnrollmentCharges(props.id)
    toast.success(
      res.created.length
        ? `${plural(res.created.length, 'cargo de inscripción generado', 'cargos de inscripción generados')} de ${money(res.amount)}.`
        : 'Todos los equipos inscritos ya tenían su cargo de inscripción.',
    )
    await load()
  } catch (e) {
    toast.error(getErrorMessage(e))
  } finally {
    generating.value = false
  }
}
</script>

<template>
  <EmptyState v-if="USE_MOCKS" :icon="Server" title="Requiere el servidor" :description="`${FINANCE_REQUIRES_SERVER}.`" class="card" />
  <LoadingState v-else-if="loading && !data" />
  <ErrorState v-else-if="error && !data" :message="error" @retry="load" />
  <section v-else-if="data" aria-labelledby="finance-title" class="space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 id="finance-title" class="text-xl font-bold">Finanzas</h2>
        <p class="text-sm text-zinc-500">Cuentas de los equipos en {{ currency }}. Kisokar solo registra los movimientos: no procesa pagos.</p>
      </div>
      <div v-if="canManage" class="flex flex-col items-start gap-1 sm:items-end">
        <AppButton variant="secondary" :loading="generating" :disabled="generating || !fee" @click="generate">
          <Receipt class="size-4" aria-hidden="true" /> Generar cargos de inscripción
        </AppButton>
        <p v-if="!fee" class="text-xs text-zinc-500">
          Configura la cuota por equipo en
          <RouterLink :to="{ name: 'admin-tournament-settings', params: { id } }" class="font-semibold text-pitch-700 underline">Configuración</RouterLink>
          para generarlos.
        </p>
        <p v-else class="text-xs text-zinc-500">Cuota vigente: {{ money(fee) }} por equipo.</p>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3 md:grid-cols-3">
      <StatCard label="Adeudo" :value="card(data.totals.due)" hint="Pendiente de cobro" highlight />
      <StatCard label="Saldo a favor" :value="card(data.totals.credit)" hint="De los equipos" />
      <StatCard label="Cargado" :value="card(data.totals.charged)" />
      <StatCard label="Pagado" :value="card(data.totals.paid)" />
      <StatCard label="Descuentos" :value="card(data.totals.discounted)" />
      <StatCard label="Devoluciones" :value="card(data.totals.refunded)" />
    </div>

    <div v-if="data.byCategory.length || data.byMethod.length" class="grid gap-3 md:grid-cols-2">
      <div class="card p-4">
        <h3 class="mb-2 text-sm font-bold">Cargos vigentes por categoría</h3>
        <p v-if="!data.byCategory.length" class="text-sm text-zinc-500">Sin cargos.</p>
        <p v-for="c in data.byCategory" :key="c.category" class="tabular flex justify-between gap-2 border-b border-zinc-100 py-1 text-sm last:border-0">
          <span class="text-zinc-600">{{ CATEGORY_LABEL[c.category] }} <span class="text-zinc-400">({{ c.entries }})</span></span><span class="font-semibold">{{ money(c.amount) }}</span>
        </p>
      </div>
      <div class="card p-4">
        <h3 class="mb-2 text-sm font-bold">Dinero por método</h3>
        <p v-if="!data.byMethod.length" class="text-sm text-zinc-500">Sin pagos ni devoluciones.</p>
        <p v-for="m in data.byMethod" :key="`${m.kind}-${m.method}`" class="tabular flex justify-between gap-2 border-b border-zinc-100 py-1 text-sm last:border-0">
          <span class="text-zinc-600">{{ m.kind === 'PAYMENT' ? 'Recibido' : 'Devuelto' }} · {{ m.method ? METHOD_LABEL[m.method] : 'Sin método' }}</span><span class="font-semibold" :class="m.kind === 'REFUND' && 'text-red-700'">{{ m.kind === 'REFUND' ? '−' : '' }}{{ money(m.amount) }}</span>
        </p>
      </div>
    </div>

    <div class="inline-flex rounded-xl bg-zinc-100 p-1 text-sm font-semibold" role="tablist" aria-label="Vista de finanzas">
      <button type="button" role="tab" class="rounded-lg px-3 py-1.5" :class="view === 'accounts' ? 'bg-white shadow-sm' : 'text-zinc-600'" :aria-selected="view === 'accounts'" @click="setView('accounts')">Cuentas</button>
      <button type="button" role="tab" class="rounded-lg px-3 py-1.5" :class="view === 'entries' ? 'bg-white shadow-sm' : 'text-zinc-600'" :aria-selected="view === 'entries'" @click="setView('entries')">Movimientos y reportes</button>
    </div>

    <FinanceEntriesReport v-if="view === 'entries'" :tournament-id="id" :accounts="data.accounts" :currency="currency" />
    <EmptyState v-else-if="!data.accounts.length" :icon="Wallet" title="Aún no hay equipos" description="Cuando inscribas equipos, aquí verás la cuenta de cada uno." class="card" />
    <div v-else class="card overflow-hidden">
      <ul class="divide-y divide-zinc-100" aria-label="Cuentas de los equipos">
        <li v-for="a in data.accounts" :key="a.teamId">
          <RouterLink
            :to="{ name: 'admin-tournament-finance-account', params: { id, teamId: a.teamId } }"
            class="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 focus-visible:bg-zinc-50"
            :aria-label="`Estado de cuenta de ${a.teamName ?? 'Equipo'}`"
          >
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <p class="truncate font-semibold text-zinc-900">{{ a.teamName ?? 'Equipo' }}</p>
                <StatusBadge v-if="ACCOUNT_STATUS[a.status]" :label="a.status === 'WITHDRAWN' && a.withdrawnAt ? `Retirado el ${formatDate(a.withdrawnAt.slice(0, 10))}` : ACCOUNT_STATUS[a.status]!.label" :tone="ACCOUNT_STATUS[a.status]!.tone" />
              </div>
              <p class="tabular hidden text-xs text-zinc-500 sm:block">
                Cargado {{ money(a.charged) }} · Pagado {{ money(a.paid) }}<template v-if="a.discounted"> · Descuentos {{ money(a.discounted) }}</template><template v-if="a.refunded"> · Devuelto {{ money(a.refunded) }}</template>
              </p>
            </div>
            <span class="hidden shrink-0 sm:block"><StatusBadge v-bind="paymentState(a, currency)" /></span>
            <span class="tabular max-w-[40%] shrink-0 text-right text-sm font-bold sm:hidden" :class="a.due ? 'text-red-700' : a.credit ? 'text-sky-800' : a.entries ? 'text-pitch-700' : 'text-zinc-500'">
              {{ a.due ? money(a.due) : a.credit ? `${money(a.credit)} a favor` : paymentState(a, currency).label }}
            </span>
            <ChevronRight class="size-4 shrink-0 text-zinc-400" aria-hidden="true" />
          </RouterLink>
        </li>
      </ul>
    </div>
  </section>
</template>
