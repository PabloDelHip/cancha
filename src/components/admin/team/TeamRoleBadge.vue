<script setup lang="ts">
import { Crown, UserCog } from 'lucide-vue-next'
import type { TeamRole } from '@/types'

/**
 * Rol de la persona RESPECTO A ESTE EQUIPO (no un tipo de cuenta). Etiquetas humanas:
 * OWNER = Propietario, MANAGER = Delegado.
 */
defineProps<{ role: TeamRole }>()
</script>

<template>
  <span
    class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold"
    :class="role === 'owner' ? 'bg-lime-400 text-pitch-950' : 'bg-pitch-100 text-pitch-900'"
  >
    <component :is="role === 'owner' ? Crown : UserCog" class="size-3.5" aria-hidden="true" />
    {{ role === 'owner' ? 'Propietario' : 'Delegado' }}
  </span>
</template>
