<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { ID, Player, PlayerCandidate, Team } from '@/types'
import { usePlayersStore } from '@/stores'
import { useToast } from '@/composables/useToast'
import { getErrorMessage, possibleDuplicates } from '@/services'
import { fullName } from '@/utils/players'
import { formatDate, toISODate } from '@/utils/format'
import { useGuardedRegister } from '@/composables/useGuardedRegister'
import BaseModal from '@/components/common/BaseModal.vue'
import AppButton from '@/components/common/AppButton.vue'
import FormField from '@/components/common/FormField.vue'
import PossibleDuplicates from '@/components/players/PossibleDuplicates.vue'

/**
 * Alta rápida desde la captura del partido: alguien jugó y aún no estaba registrado. Solo nombre,
 * apellidos y (opcional) dorsal; la posición queda como mediocampista y el resto de la ficha se
 * completa después desde el equipo. Es el mismo alta de siempre: el servidor revisa posibles
 * duplicados (se elige al existente o se confirma que es otra persona) y se inscribe en el equipo
 * de este torneo.
 * 3A: si el partido ya pasó, inscribirlo hoy no lo habilita para ese partido: se inscribe con
 * elegibilidad retroactiva a la fecha del partido. El motivo se registra solo (2026-10-18, pedido
 * del usuario) y queda auditado con quién lo dio de alta. Solo quien puede autorizar excepciones
 * (propietario o administrador); el máximo de jugadores también se respeta.
 */
const props = defineProps<{ open: boolean; tournamentId: ID; team: Team | undefined; matchDate: string }>()
const emit = defineEmits<{ close: []; added: [player: Player, shirtNumber: number | null] }>()
const players = usePlayersStore()
const toast = useToast()

const guarded = useGuardedRegister(() => props.tournamentId)
const past = computed(() => props.matchDate < toISODate(new Date()))
/** Motivo automático de la inscripción retroactiva (queda en la auditoría de la participación). */
const retroReason = computed(() => `Alta desde la captura del partido del ${formatDate(props.matchDate)}: jugó ese partido.`)
const form = reactive({ firstName: '', lastName: '', shirtNumber: '' as number | '' })
const errors = reactive<{ firstName?: string; lastName?: string; shirtNumber?: string }>({})
const saving = ref(false)
const candidates = ref<PlayerCandidate[] | null>(null)
/** Quien ya participa en este torneo no se puede elegir otra vez. */
const inTournament = computed(() => new Set((candidates.value ?? []).filter((c) => players.membershipIn(props.tournamentId, c.player.id)).map((c) => c.player.id)))

watch(
  () => props.open,
  (open) => {
    if (!open) return
    Object.assign(form, { firstName: '', lastName: '', shirtNumber: '' })
    Object.assign(errors, { firstName: undefined, lastName: undefined, shirtNumber: undefined })
    candidates.value = null
  },
)

function number(): number | null | false {
  if (form.shirtNumber === '' || form.shirtNumber === null) return null
  const n = Number(form.shirtNumber)
  if (!Number.isInteger(n) || n < 1 || n > 99) return false
  return n
}
function validate() {
  errors.firstName = form.firstName.trim() ? undefined : 'Escribe el nombre.'
  errors.lastName = form.lastName.trim() ? undefined : 'Escribe los apellidos.'
  const n = number()
  errors.shirtNumber =
    n === false
      ? 'Entre 1 y 99.'
      : n !== null && props.team && players.rosterOf(props.team.id, props.tournamentId).some((e) => e.membership.shirtNumber === n)
        ? `El #${n} ya está ocupado en este equipo.`
        : undefined
  return !errors.firstName && !errors.lastName && !errors.shirtNumber
}

/** Lo inscribe en el equipo de este torneo y lo entrega a la captura. */
async function register(player: Pick<Player, 'id' | 'firstName' | 'lastName'>) {
  const shirtNumber = number() || null
  // Partido de hoy o anterior: siempre con su fecha. Así cuenta en él aunque el servidor ya esté en
  // el día siguiente (UTC); si para el servidor no es anterior a hoy, el motivo simplemente no se usa.
  const retro = props.matchDate <= toISODate(new Date()) ? { startDate: props.matchDate, retroactiveReason: retroReason.value } : {}
  if (!(await guarded.register(player.id, { tournamentId: props.tournamentId, teamId: props.team!.id, shirtNumber, ...retro }))) return
  const full = players.get(player.id) ?? (player as Player)
  toast.success(`${fullName(full)} agregado a ${props.team!.name}.`)
  emit('added', full, shirtNumber)
}

async function create(confirmNew: boolean) {
  if (!props.team || !validate()) return
  saving.value = true
  try {
    const created = await players.create({ firstName: form.firstName.trim(), lastName: form.lastName.trim(), position: 'MID', birthDate: null }, { confirmNew })
    await register(created)
  } catch (e) {
    const found = possibleDuplicates(e)
    if (found) candidates.value = found
    else toast.error(getErrorMessage(e))
  } finally {
    saving.value = false
  }
}

/** "Es este jugador": se reutiliza su perfil (conserva su historial). */
async function chooseExisting(player: Pick<Player, 'id' | 'firstName' | 'lastName'>) {
  if (!validate()) return void (candidates.value = null)
  saving.value = true
  try {
    await register(player)
  } catch (e) {
    toast.error(getErrorMessage(e))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <BaseModal
    :open="open"
    :title="candidates ? '¿Ya está registrado?' : `Nuevo jugador · ${team?.name ?? ''}`"
    :description="candidates ? undefined : 'Para quien jugó hoy y aún no está en la plantilla. Lo demás de su ficha se completa después.'"
    @close="saving || emit('close')"
  >
    <PossibleDuplicates
      v-if="candidates"
      :candidates="candidates"
      :taken-ids="inTournament"
      taken-label="Ya está en este torneo"
      :busy="saving"
      @choose="chooseExisting"
      @create-anyway="create(true)"
      @back="candidates = null"
    />
    <form v-else id="quick-player" class="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_6rem]" novalidate @submit.prevent="create(false)">
      <FormField id="qp-first" label="Nombre" :error="errors.firstName" required>
        <input id="qp-first" v-model="form.firstName" class="input" maxlength="60" autocomplete="off" autofocus />
      </FormField>
      <FormField id="qp-last" label="Apellidos" :error="errors.lastName" required>
        <input id="qp-last" v-model="form.lastName" class="input" maxlength="60" autocomplete="off" />
      </FormField>
      <FormField id="qp-number" label="Dorsal" :error="errors.shirtNumber" hint="Opcional">
        <input id="qp-number" v-model.number="form.shirtNumber" type="number" min="1" max="99" inputmode="numeric" class="input" />
      </FormField>
      <template v-if="past">
        <p v-if="!guarded.canExceptions.value" class="text-sm text-red-700 sm:col-span-3">
          El partido fue el {{ formatDate(matchDate) }}: habilitar a alguien para un partido anterior a su inscripción lo autoriza el propietario o un administrador del torneo.
        </p>
        <p v-else class="text-xs text-amber-700 sm:col-span-3">
          Se inscribe con fecha del {{ formatDate(matchDate) }} para que cuente en este partido. Quedará registrado quién lo dio de alta y el motivo: «{{ retroReason }}»
        </p>
      </template>
    </form>
    <template v-if="!candidates" #footer>
      <AppButton variant="secondary" :disabled="saving" @click="emit('close')">Cancelar</AppButton>
      <AppButton type="submit" form="quick-player" :loading="saving" :disabled="past && !guarded.canExceptions.value">Agregar y marcar que jugó</AppButton>
    </template>
  </BaseModal>
</template>
