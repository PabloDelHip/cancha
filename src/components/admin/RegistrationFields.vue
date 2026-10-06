<script setup lang="ts">
import type { ID, Team } from '@/types'
import FormField from '@/components/common/FormField.vue'

/** Equipo + dorsal de un jugador dentro de un torneo (participación). */
export interface RegistrationDraft {
  teamId: ID | ''
  shirtNumber: number | null
}

const model = defineModel<RegistrationDraft>({ required: true })
defineProps<{ teams: Team[]; errors: { teamId?: string; shirtNumber?: string }; idPrefix: string }>()
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
  </div>
</template>
