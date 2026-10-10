<script setup lang="ts">
import { BrickWall, Flag, Footprints, Goal, Handshake, Hash, ShieldCheck, Sparkles, Star } from 'lucide-vue-next'
import type { MilestoneType, PlayerMilestone } from '@/types'
import { formatDate } from '@/utils/format'

/** Hitos en Kisokar: derivados en el servidor de su historia oficial, en orden (el más reciente arriba). */
defineProps<{ milestones: PlayerMilestone[] }>()

const LABEL: Record<MilestoneType, { icon: unknown; text: (v: number | null) => string }> = {
  first_match: { icon: Flag, text: () => 'Debut oficial' },
  first_goal: { icon: Goal, text: () => 'Primer gol' },
  first_assist: { icon: Handshake, text: () => 'Primera asistencia' },
  first_brace: { icon: Star, text: () => 'Primer doblete' },
  first_hat_trick: { icon: Sparkles, text: () => 'Primer hat-trick' },
  goals: { icon: Hash, text: (v) => `Gol #${v}` },
  matches: { icon: Footprints, text: (v) => `Partido #${v}` },
  first_clean_sheet: { icon: ShieldCheck, text: () => 'Primera portería en cero' },
  clean_sheets: { icon: BrickWall, text: (v) => `Portería en cero #${v}` },
}

function rival(m: PlayerMilestone['match']) {
  return m.homeTeam?.id === m.playerTeamId ? m.awayTeam : m.homeTeam
}
</script>

<template>
  <ol class="relative ml-3 border-l-2 border-zinc-200">
    <li v-for="m in milestones" :key="`${m.type}-${m.value}`" class="relative pb-4 pl-6 last:pb-0">
      <span class="absolute top-0 -left-[15px] grid size-7 place-items-center rounded-full bg-lime-400 text-pitch-950 ring-4 ring-canvas" aria-hidden="true">
        <component :is="LABEL[m.type].icon" class="size-3.5" />
      </span>
      <p class="font-display text-lg leading-tight font-bold text-zinc-950">{{ LABEL[m.type].text(m.value) }}</p>
      <RouterLink :to="{ name: 'match', params: { id: m.match.id } }" class="block text-xs text-zinc-600 hover:text-pitch-700">
        {{ formatDate(m.match.date) }}<template v-if="rival(m.match)"> · vs {{ rival(m.match)?.name }}</template>
        <template v-if="m.match.tournament"> · {{ m.match.tournament.name }}</template>
      </RouterLink>
    </li>
  </ol>
</template>
