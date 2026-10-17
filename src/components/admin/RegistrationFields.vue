<script setup lang="ts">
import { computed } from 'vue'
import type { ID, ISODate, Team } from '@/types'
import { toISODate } from '@/utils/format'
import FormField from '@/components/common/FormField.vue'

/** Equipo + dorsal de un jugador dentro de un torneo (participación) y, opcional, desde cuándo puede jugar. */
export interface RegistrationDraft {
  teamId: ID | ''
  shirtNumber: number | null
  /** Fecha efectiva; vacía = hoy. Anterior a hoy = retroactiva (con motivo). */
  startDate: ISODate | ''
  retroactiveReason: string
}

const model = defineModel<RegistrationDraft>({ required: true })
const props = defineProps<{
  teams: Team[]
  errors: { teamId?: string; shirtNumber?: string; startDate?: string; retroactiveReason?: string }
  idPrefix: string
  /** Solo quien puede autorizar excepciones (propietario/administrador) ve la fecha efectiva. */
  allowRetroactive?: boolean
}>()
const today = toISODate(new Date())
const retroactive = computed(() => props.allowRetroactive && !!model.value.startDate && model.value.startDate < today)
</script>

<template>
  <div class="grid grid-cols-[1fr_7rem] gap-4">
    <FormField :id="`${idPrefix}-team`" label="Equipo en este torneo" :error="errors.teamId" required>
      <select
        :id="`${idPrefix}-team`"
        v-model="model.teamId"
        class="input"
        :aria-invalid="!!errors.teamId || undefined"
        :aria-describedby="errors.teamId ? `${idPrefix}-team-error` : undefined"
      >
        <option value="" disabled>Selecciona…</option>
        <option v-for="t in teams" :key="t.id" :value="t.id">{{ t.name }}</option>
      </select>
    </FormField>
    <FormField :id="`${idPrefix}-number`" label="Dorsal" :error="errors.shirtNumber">
      <input
        :id="`${idPrefix}-number`"
        v-model.number="model.shirtNumber"
        type="number"
        inputmode="numeric"
        min="1"
        max="99"
        class="input"
        :aria-invalid="!!errors.shirtNumber || undefined"
        :aria-describedby="errors.shirtNumber ? `${idPrefix}-number-error` : undefined"
      />
    </FormField>
    <FormField
      v-if="allowRetroactive"
      :id="`${idPrefix}-start`"
      label="Puede jugar desde"
      :error="errors.startDate"
      hint="Vacío = hoy. Una fecha anterior habilita partidos ya jugados y requiere motivo."
      class="col-span-2"
    >
      <input :id="`${idPrefix}-start`" v-model="model.startDate" type="date" :max="today" class="input" />
    </FormField>
    <FormField v-if="retroactive" :id="`${idPrefix}-retro`" label="Motivo de la fecha retroactiva" :error="errors.retroactiveReason" required class="col-span-2">
      <textarea :id="`${idPrefix}-retro`" v-model="model.retroactiveReason" rows="2" maxlength="300" class="input" placeholder="Ej. Jugó la jornada 3 y no estaba inscrito" />
      <p class="mt-1 text-xs text-amber-700">Quedará registrado quién lo autorizó y por qué. No cambia partidos ya capturados.</p>
    </FormField>
  </div>
</template>
