<script setup lang="ts">
import { ref, watch } from 'vue'
import { useTournamentStats } from '@/composables/useTournamentStats'
import { leagueService } from '@/services'
import TournamentInformation from '@/components/tournaments/TournamentInformation.vue'

const props = defineProps<{ id: string }>()
const { tournament } = useTournamentStats(() => props.id)
const leagueCity = ref<string | null>(null)
watch(() => tournament.value?.leagueId, async (id) => {
  leagueCity.value = null
  if (!id) return
  try {
    const league = await leagueService.get(id)
    if (id === tournament.value?.leagueId) leagueCity.value = league.city
  } catch { /* The tournament's own location remains available. */ }
}, { immediate: true })
</script>

<template>
  <TournamentInformation v-if="tournament" :tournament="tournament" :league-city="leagueCity" />
</template>
