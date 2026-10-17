<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ArrowLeftRight, Plus, Trash2 } from 'lucide-vue-next'
import type { ID, MatchSheet, SheetTeamSide } from '@/types'
import { getErrorMessage, sheetService } from '@/services'
import { useSameDateOverride } from '@/composables/useSameDateOverride'
import { usePlayersStore } from '@/stores'
import { useToast } from '@/composables/useToast'
import AppButton from '@/components/common/AppButton.vue'
import FormField from '@/components/common/FormField.vue'

/**
 * Captura de la alineación de un equipo en la ficha: quién es titular o suplente, dorsal del
 * partido, capitán y sustituciones (minuto, sale, entra). Pensado para el celular en la cancha:
 * una fila por jugador con un selector de tres estados. El servidor valida plantilla, elegibilidad,
 * coherencia con las estadísticas y sustituciones.
 */
const props = defineProps<{ matchId: ID; tournamentId: ID; matchDate: string; side: SheetTeamSide; finished: boolean }>()
const emit = defineEmits<{ saved: [sheet: MatchSheet]; cancel: [] }>()
const players = usePlayersStore()
const toast = useToast()
const sameDate = useSameDateOverride(() => props.tournamentId)

type Role = 'out' | 'starter' | 'bench'
interface Row {
  playerId: ID
  name: string
  role: Role
  jerseyNumber: number | null
}
// Plantilla del equipo elegible en la fecha del partido (3A) + quien ya esté en la alineación.
const current = new Map((props.side.lineup?.players ?? []).map((p) => [p.playerId, p]))
const roster = players.rosterOn(props.side.team.id, props.tournamentId, props.matchDate)
const rows = reactive<Row[]>([
  ...roster.map((e) => {
    const p = current.get(e.player.id)
    return { playerId: e.player.id, name: `${e.player.firstName} ${e.player.lastName}`, role: (p ? (p.starter ? 'starter' : 'bench') : 'out') as Role, jerseyNumber: p ? p.jerseyNumber : e.membership.shirtNumber }
  }),
  ...[...current.values()].filter((p) => !roster.some((e) => e.player.id === p.playerId)).map((p) => ({ playerId: p.playerId, name: p.name ?? 'Jugador', role: (p.starter ? 'starter' : 'bench') as Role, jerseyNumber: p.jerseyNumber })),
])
const captain = ref<ID | ''>(props.side.lineup?.players.find((p) => p.captain)?.playerId ?? '')
const subs = reactive((props.side.lineup?.substitutions ?? []).map((s) => ({ outPlayerId: s.outPlayerId, inPlayerId: s.inPlayerId, minute: s.minute as number | null })))
const reason = ref('')
const saving = ref(false)

const listed = computed(() => rows.filter((r) => r.role !== 'out'))
const starters = computed(() => rows.filter((r) => r.role === 'starter').length)
const needsReason = computed(() => props.finished && !!props.side.lineup?.players.length)
const nameOf = (id: ID) => rows.find((r) => r.playerId === id)?.name ?? 'Jugador'

function addSub() {
  subs.push({ outPlayerId: '', inPlayerId: '', minute: null })
}

async function save() {
  if (subs.some((s) => !s.outPlayerId || !s.inPlayerId || s.minute === null)) return toast.error('Completa cada sustitución: minuto, quién sale y quién entra.')
  if (needsReason.value && reason.value.trim().length < 3) return toast.error('Indica el motivo de la corrección (el partido ya finalizó).')
  saving.value = true
  try {
    const sheet = await sameDate.run((sameDateReason) =>
      sheetService.saveTeam(props.matchId, props.side.team.id, {
        players: listed.value.map((r) => ({ playerId: r.playerId, starter: r.role === 'starter', jerseyNumber: typeof r.jerseyNumber === 'number' ? r.jerseyNumber : null, captain: captain.value === r.playerId })),
        substitutions: subs.map((s) => ({ outPlayerId: s.outPlayerId, inPlayerId: s.inPlayerId, minute: Number(s.minute) })),
        ...(reason.value.trim() ? { reason: reason.value.trim() } : {}),
        ...(sameDateReason ? { sameDateReason } : {}),
      }),
    )
    if (!sheet) return
    if (sheet.warnings?.length) toast.info(`Alineación guardada. Aviso: ${sheet.warnings.join(' ')}`)
    else toast.success('Alineación guardada.')
    emit('saved', sheet)
  } catch (e) {
    toast.error(getErrorMessage(e))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="save">
    <p class="text-xs text-zinc-500">{{ starters }} titulares · {{ listed.length - starters }} suplentes. Los suplentes que no ingresan no cuentan como jugados.</p>
    <ul class="divide-y divide-zinc-100 rounded-xl border border-zinc-200">
      <li v-for="r in rows" :key="r.playerId" class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 py-2 sm:grid-cols-[minmax(0,1fr)_auto_4.5rem_auto]">
        <span class="truncate text-sm font-semibold" :class="r.role === 'out' ? 'text-zinc-400' : 'text-zinc-900'">{{ r.name }}</span>
        <div role="radiogroup" :aria-label="`Convocatoria de ${r.name}`" class="flex rounded-lg bg-zinc-100 p-0.5 text-xs font-semibold">
          <label v-for="opt in [{ v: 'starter', l: 'Titular' }, { v: 'bench', l: 'Suplente' }, { v: 'out', l: 'No' }]" :key="opt.v" class="cursor-pointer rounded-md px-2 py-1 text-zinc-600 has-[:checked]:bg-white has-[:checked]:text-zinc-950 has-[:checked]:shadow-sm">
            <input v-model="r.role" type="radio" :name="`role-${side.side}-${r.playerId}`" :value="opt.v" class="sr-only" /> {{ opt.l }}
          </label>
        </div>
        <template v-if="r.role !== 'out'">
          <label class="flex items-center gap-1 text-xs text-zinc-500 sm:justify-end">
            #<input v-model.number="r.jerseyNumber" type="number" min="0" max="99" inputmode="numeric" class="input h-8 w-14 px-2 text-sm" :aria-label="`Dorsal de ${r.name}`" />
          </label>
          <label class="flex items-center gap-1 text-xs text-zinc-600">
            <input v-model="captain" type="radio" :name="`captain-${side.side}`" :value="r.playerId" class="accent-pitch-700" /> Capitán
          </label>
        </template>
      </li>
    </ul>
    <p v-if="!rows.length" class="text-sm text-zinc-500">El equipo no tiene jugadores registrados en el torneo.</p>

    <section aria-label="Sustituciones" class="space-y-2">
      <div class="flex items-center justify-between">
        <h4 class="flex items-center gap-1.5 text-sm font-semibold text-zinc-900"><ArrowLeftRight class="size-4" aria-hidden="true" /> Sustituciones</h4>
        <AppButton variant="secondary" size="sm" :disabled="listed.length < 2" @click="addSub"><Plus class="size-4" aria-hidden="true" /> Agregar</AppButton>
      </div>
      <p v-if="!subs.length" class="text-xs text-zinc-500">Opcional: no hace falta capturar todas para cerrar la ficha.</p>
      <div v-for="(s, i) in subs" :key="i" class="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-end gap-2 rounded-xl bg-zinc-50 p-2 sm:grid-cols-[4.5rem_minmax(0,1fr)_minmax(0,1fr)_auto]">
        <FormField :id="`sub-min-${side.side}-${i}`" label="Minuto">
          <input :id="`sub-min-${side.side}-${i}`" v-model.number="s.minute" type="number" min="0" max="200" inputmode="numeric" class="input" />
        </FormField>
        <FormField :id="`sub-out-${side.side}-${i}`" label="Sale">
          <select :id="`sub-out-${side.side}-${i}`" v-model="s.outPlayerId" class="input">
            <option value="" disabled>Elige</option>
            <option v-for="r in listed" :key="r.playerId" :value="r.playerId">{{ r.jerseyNumber ?? '–' }} · {{ r.name }}</option>
          </select>
        </FormField>
        <FormField :id="`sub-in-${side.side}-${i}`" label="Entra" class="col-span-2 sm:col-span-1">
          <select :id="`sub-in-${side.side}-${i}`" v-model="s.inPlayerId" class="input">
            <option value="" disabled>Elige</option>
            <option v-for="r in listed" :key="r.playerId" :value="r.playerId" :disabled="r.playerId === s.outPlayerId">{{ r.jerseyNumber ?? '–' }} · {{ r.name }}</option>
          </select>
        </FormField>
        <AppButton variant="ghost" size="sm" icon class="text-red-700" :aria-label="`Quitar la sustitución ${s.minute ?? ''}' ${nameOf(s.outPlayerId)}`" @click="subs.splice(i, 1)">
          <Trash2 class="size-4" aria-hidden="true" />
        </AppButton>
      </div>
    </section>

    <FormField v-if="needsReason" :id="`lineup-reason-${side.side}`" label="Motivo de la corrección" hint="El partido ya finalizó: queda en el historial.">
      <input :id="`lineup-reason-${side.side}`" v-model="reason" class="input" maxlength="300" placeholder="Ej. dorsales según la cédula arbitral" />
    </FormField>
    <div class="flex justify-end gap-2">
      <AppButton variant="secondary" :disabled="saving" @click="emit('cancel')">Cancelar</AppButton>
      <AppButton type="submit" :loading="saving">Guardar alineación</AppButton>
    </div>
  </form>
</template>
