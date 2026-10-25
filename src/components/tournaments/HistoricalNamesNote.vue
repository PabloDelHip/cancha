<script setup lang="ts">
import { computed } from 'vue'
import { Info } from 'lucide-vue-next'
import type { ID } from '@/types'
import { useHistoricalNamesStore } from '@/stores'

/**
 * 10C — torneo finalizado SIN foto de nombres (se cerró antes de que Kisokar los conservara): se
 * avisa que los nombres de equipos y jugadores son los actuales, sin presentarlos como originales.
 */
const props = defineProps<{ tournamentId: ID }>()
const names = useHistoricalNamesStore()
const show = computed(() => names.historical(props.tournamentId) === false)
</script>

<template>
  <p v-if="show" class="flex items-start gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600" role="note">
    <Info class="mt-0.5 size-4 shrink-0 text-zinc-400" aria-hidden="true" />
    Este torneo se finalizó antes de que Kisokar conservara los nombres con que se jugó: se muestran los nombres actuales de equipos y jugadores, que pudieron cambiar después.
  </p>
</template>
