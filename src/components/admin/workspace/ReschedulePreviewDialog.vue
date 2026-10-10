<script setup lang="ts">
import { computed } from 'vue'
import { AlertTriangle, Ban, CheckCircle2, MapPin, UserRound } from 'lucide-vue-next'
import type { ResourceConflict, ReschedulePreview } from '@/types'
import { formatDate } from '@/utils/format'
import { REFEREE_ROLE } from '@/utils/labels'
import BaseModal from '@/components/common/BaseModal.vue'
import AppButton from '@/components/common/AppButton.vue'

/**
 * Vista previa de una reprogramación (2C-2): qué cancha y qué árbitros se conservan y cuáles chocan
 * en el nuevo horario y se liberarían. Solo se libera lo que choca; nada se aplica sin confirmar.
 * Si algo cambió mientras tanto, el servidor responde con una vista previa nueva.
 */
const props = defineProps<{ open: boolean; preview: ReschedulePreview | null; busy?: boolean; stale?: boolean }>()
const emit = defineEmits<{ close: []; confirm: [] }>()

const keep = computed(() => [
  ...(props.preview?.field?.action === 'KEEP' ? [{ key: 'field', icon: MapPin, label: `Cancha ${props.preview.field.label}`, warnings: props.preview.field.warnings }] : []),
  ...(props.preview?.referees.filter((r) => r.action === 'KEEP').map((r) => ({ key: r.assignmentId, icon: UserRound, label: `${r.name ?? 'Árbitro'} (${roleOf(r.role)})`, warnings: r.warnings })) ?? []),
])
const release = computed(() => [
  ...(props.preview?.field?.action === 'RELEASE' ? [{ key: 'field', icon: MapPin, label: `Cancha ${props.preview.field.label}`, conflict: props.preview.field.conflicts[0], more: props.preview.field.conflicts.length - 1 }] : []),
  ...(props.preview?.referees
    .filter((r) => r.action === 'RELEASE')
    .map((r) => ({ key: r.assignmentId, icon: UserRound, label: `${r.name ?? 'Árbitro'} (${roleOf(r.role)})`, conflict: r.conflicts[0], more: r.conflicts.length - 1 })) ?? []),
])
const roleOf = (role: string) => REFEREE_ROLE[role.toLowerCase() as keyof typeof REFEREE_ROLE] ?? role
const clash = (c: ResourceConflict) => `${c.homeTeam} vs ${c.awayTeam} (${c.tournamentName}) de ${c.time} a ${c.endTime}`
</script>

<template>
  <BaseModal
    :open="open"
    title="Confirmar reprogramación"
    :description="preview ? `Nuevo horario: ${formatDate(preview.date)} a las ${preview.time}` : undefined"
    @close="busy || emit('close')"
  >
    <div v-if="preview" class="space-y-4 text-sm">
      <p v-if="stale" class="flex gap-1.5 rounded-xl bg-amber-50 p-3 text-amber-900" role="alert">
        <AlertTriangle class="mt-0.5 size-4 shrink-0" aria-hidden="true" /> La disponibilidad cambió desde que revisaste. Esto es lo que aplica ahora.
      </p>
      <section v-if="release.length" aria-labelledby="rp-release">
        <h3 id="rp-release" class="mb-1.5 font-semibold text-red-800">Se liberan (chocan en el nuevo horario)</h3>
        <ul class="space-y-1.5">
          <li v-for="r in release" :key="r.key" class="flex gap-2">
            <Ban class="mt-0.5 size-4 shrink-0 text-red-600" aria-hidden="true" />
            <span>
              <strong>{{ r.label }}</strong>
              <span v-if="r.conflict" class="block text-xs text-zinc-500">Ya ocupado: {{ clash(r.conflict) }}{{ r.more > 0 ? ` y ${r.more} más` : '' }}.</span>
            </span>
          </li>
        </ul>
      </section>
      <section v-if="keep.length" aria-labelledby="rp-keep">
        <h3 id="rp-keep" class="mb-1.5 font-semibold text-pitch-800">Se conservan</h3>
        <ul class="space-y-1.5">
          <li v-for="k in keep" :key="k.key" class="flex gap-2">
            <CheckCircle2 class="mt-0.5 size-4 shrink-0 text-pitch-700" aria-hidden="true" />
            <span>
              {{ k.label }}
              <span v-for="w in k.warnings" :key="w" class="block text-xs text-amber-800">{{ w }} (se puede guardar).</span>
            </span>
          </li>
        </ul>
      </section>
      <p class="text-xs text-zinc-500">Lo liberado queda registrado en el historial del partido; después puedes asignar otra cancha u otro árbitro.</p>
    </div>
    <template #footer>
      <AppButton variant="secondary" :disabled="busy" @click="emit('close')">Volver</AppButton>
      <AppButton variant="danger" :loading="busy" @click="emit('confirm')">Reprogramar y liberar</AppButton>
    </template>
  </BaseModal>
</template>
