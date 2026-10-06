<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ChevronRight, MapPin, Medal } from 'lucide-vue-next'
import type { LeagueSummary } from '@/types'
import { getErrorMessage, leagueService } from '@/services'
import PageHeader from '@/components/common/PageHeader.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import EmptyState from '@/components/common/EmptyState.vue'

/** Ligas con torneos: cada una agrupa sus Apertura, Clausura y copas, y su histórico. */
const leagues = ref<LeagueSummary[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
async function load() {
  loading.value = true
  error.value = null
  try {
    leagues.value = await leagueService.list()
  } catch (e) {
    error.value = getErrorMessage(e)
  } finally {
    loading.value = false
  }
}
onMounted(load)
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
    <PageHeader eyebrow="Competiciones" title="Ligas" subtitle="Cada liga reúne sus torneos a lo largo del tiempo: campeones, récords e historia." />
    <LoadingState v-if="loading" />
    <ErrorState v-else-if="error" :message="error" @retry="load" />
    <ul v-else-if="leagues.length" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <li v-for="l in leagues" :key="l.id">
        <RouterLink :to="{ name: 'league', params: { id: l.id } }" class="group relative block overflow-hidden rounded-3xl bg-pitch-950 p-5 text-white transition hover:-translate-y-0.5 hover:shadow-xl">
          <Medal class="absolute -right-4 -bottom-6 size-32 text-white/5" aria-hidden="true" />
          <p class="text-[11px] font-bold tracking-wider text-lime-300 uppercase">Liga</p>
          <p class="display mt-1 text-3xl leading-none break-words">{{ l.name }}</p>
          <p v-if="l.city" class="mt-2 inline-flex items-center gap-1 text-sm text-pitch-200"><MapPin class="size-4" aria-hidden="true" /> {{ l.city }}</p>
          <p class="mt-4 flex items-center justify-between text-sm">
            <span class="font-semibold">{{ l.tournaments }} {{ l.tournaments === 1 ? 'torneo' : 'torneos' }}</span>
            <span class="inline-flex items-center gap-0.5 rounded-full bg-lime-400 px-3 py-1 text-xs font-bold text-pitch-950">Ver liga <ChevronRight class="size-3.5" aria-hidden="true" /></span>
          </p>
        </RouterLink>
      </li>
    </ul>
    <EmptyState v-else :icon="Medal" title="Aún no hay ligas" description="Las ligas aparecen cuando un organizador crea su primer torneo." class="card" />
  </div>
</template>
