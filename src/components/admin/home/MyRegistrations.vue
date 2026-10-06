<script setup lang="ts">
import { computed } from 'vue'
import { ArrowRight, Clock, PauseCircle, X } from 'lucide-vue-next'
import type { RegistrationDraftStep } from '@/types'
import { useHomeStore } from '@/stores'
import { useRegistrationDrafts } from '@/composables/useRegistrationDrafts'
import { formatDate, plural, toISODate } from '@/utils/format'
import AppButton from '@/components/common/AppButton.vue'
import TeamLogo from '@/components/teams/TeamLogo.vue'

/**
 * Inscripciones de la cuenta: las que dejó a medias (continuar o cancelar) y las enviadas que
 * esperan al organizador. Sin nada que mostrar, no ocupa espacio.
 */
const home = useHomeStore()
const drafts = useRegistrationDrafts()

const STEP: Record<RegistrationDraftStep, string> = {
  team: 'Falta elegir el equipo',
  players: 'Eligiendo jugadores',
  review: 'Lista para revisar y enviar',
}
const any = computed(() => home.drafts.length > 0 || home.pendingRequests.length > 0)
const day = (iso: string) => formatDate(toISODate(new Date(iso)))
</script>

<template>
  <section v-if="any" aria-labelledby="my-registrations-title">
    <h2 id="my-registrations-title" class="mb-3 text-lg font-bold">Inscripciones</h2>
    <ul class="card divide-y divide-zinc-100">
      <li v-for="d in home.drafts" :key="`d-${d.tournament.id}`" class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div class="flex min-w-0 flex-1 items-center gap-3">
          <TeamLogo v-if="d.team" :team="d.team" size="sm" class="shrink-0" />
          <PauseCircle v-else class="size-8 shrink-0 text-amber-500" aria-hidden="true" />
          <div class="min-w-0">
            <p class="truncate font-semibold text-zinc-950">{{ d.team?.name ?? 'Equipo sin elegir' }} · {{ d.tournament.name }}</p>
            <p class="text-xs text-zinc-500">
              <span class="font-semibold text-amber-700">Sin terminar</span> · {{ STEP[d.step] }}<template v-if="d.playerCount"> ({{ plural(d.playerCount, 'jugador', 'jugadores') }})</template> · {{ day(d.updatedAt) }}
            </p>
            <p v-if="!d.token" class="text-xs text-zinc-500">El enlace de inscripción ya no está activo: pide uno nuevo al organizador.</p>
          </div>
        </div>
        <div class="flex shrink-0 gap-2">
          <AppButton variant="secondary" size="sm" @click="drafts.cancel(d)"><X class="size-3.5" aria-hidden="true" /> Cancelar</AppButton>
          <AppButton v-if="d.token" size="sm" @click="drafts.resume(d)">Continuar <ArrowRight class="size-3.5" aria-hidden="true" /></AppButton>
        </div>
      </li>
      <li v-for="r in home.pendingRequests" :key="`r-${r.id}`" class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div class="flex min-w-0 flex-1 items-center gap-3">
          <TeamLogo v-if="r.team" :team="r.team" size="sm" class="shrink-0" />
          <div class="min-w-0">
            <p class="truncate font-semibold text-zinc-950">{{ r.team?.name ?? 'Equipo' }} · {{ r.tournament.name }}</p>
            <p class="flex items-center gap-1 text-xs text-zinc-500">
              <Clock class="size-3.5 text-sky-600" aria-hidden="true" />
              <span class="font-semibold text-sky-700">Enviada</span> · esperando al organizador · {{ plural(r.playerCount, 'jugador', 'jugadores') }} · {{ day(r.submittedAt) }}
            </p>
          </div>
        </div>
        <AppButton v-if="r.token" variant="secondary" size="sm" :to="{ name: 'join', params: { token: r.token } }">Ver estado</AppButton>
      </li>
    </ul>
  </section>
</template>
