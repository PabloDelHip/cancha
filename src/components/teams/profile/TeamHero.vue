<script setup lang="ts">
import { MapPin, Shield } from 'lucide-vue-next'
import type { TeamCompetition, TeamProfile } from '@/types'
import TeamLogo from '@/components/teams/TeamLogo.vue'

/**
 * Identidad del equipo. Solo datos que existen: escudo, nombre, colores y ciudad. La categoría
 * pertenece a cada torneo (se ve en sus competiciones) y el año de fundación no existe en el modelo.
 */
defineProps<{ team: TeamProfile['team']; current: TeamCompetition[] }>()
</script>

<template>
  <section class="relative overflow-hidden text-white" :style="{ backgroundColor: team.colors.primary }">
    <div class="absolute inset-0 bg-gradient-to-b from-black/25 to-black/65" aria-hidden="true" />
    <div
      class="absolute inset-y-0 right-0 w-1/3 opacity-25"
      :style="{ background: `linear-gradient(110deg, transparent 30%, ${team.colors.secondary} 30.2%)` }"
      aria-hidden="true"
    />
    <div class="relative mx-auto max-w-6xl px-4 pt-8 pb-20 sm:px-6 sm:pt-12 sm:pb-24">
      <div class="flex flex-col gap-5 sm:flex-row sm:items-end sm:gap-7">
        <div class="w-fit rounded-3xl bg-white/95 p-3 shadow-lg">
          <TeamLogo :team="team" size="xl" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold text-white/85">
            <span class="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-xs font-medium">
              <Shield class="size-3.5" aria-hidden="true" /> Perfil del equipo
            </span>
            <span v-if="team.city" class="inline-flex items-center gap-1 font-medium">
              <MapPin class="size-4" aria-hidden="true" /> {{ team.city }}
            </span>
          </p>
          <h1 class="display mt-2 text-[2.75rem] leading-[0.92] break-words sm:text-7xl">{{ team.name }}</h1>
        </div>
      </div>

      <div class="mt-6">
        <p class="eyebrow text-white/70">
          {{ current.length > 1 ? `Compite actualmente en ${current.length} torneos` : 'Compite actualmente en' }}
        </p>
        <ul v-if="current.length" class="mt-2 grid gap-2 sm:flex sm:flex-wrap">
          <li
            v-for="c in current"
            :key="c.tournament.id"
            class="flex min-w-0 items-center justify-between gap-4 rounded-2xl bg-black/20 px-4 py-2.5 ring-1 ring-white/15 backdrop-blur sm:max-w-sm"
          >
            <RouterLink :to="{ name: 'tournament', params: { id: c.tournament.id } }" class="min-w-0 font-semibold break-words hover:underline">
              {{ c.tournament.name }}
            </RouterLink>
            <span v-if="c.standing" class="tabular shrink-0 text-sm text-white/85">
              <span class="font-display text-lg font-bold text-white">{{ c.standing.position }}º</span> de {{ c.standing.teams }}
            </span>
            <!-- Sin posición (p. ej. seguimiento parcial) no significa sin partidos. -->
            <span v-else class="shrink-0 text-xs text-white/70">{{ c.record.played ? `${c.record.played} PJ` : c.tournament.status === 'draft' ? 'Por empezar' : 'Sin partidos aún' }}</span>
          </li>
        </ul>
        <p v-else class="mt-1 text-sm text-white/75">Sin torneos en curso.</p>
      </div>
    </div>
  </section>
</template>
