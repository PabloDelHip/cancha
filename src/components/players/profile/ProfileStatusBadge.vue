<script setup lang="ts">
import { computed } from 'vue'
import { BadgeCheck, IdCard, UserCheck } from 'lucide-vue-next'

/**
 * Estado de identidad del perfil. Hoy SIEMPRE "sports": no existe claim ni verificación, así que
 * nunca se muestra "reclamado" o "verificado" sin una fuente real. Los otros estados quedan
 * preparados para cuando exista Player Account (User ≠ Player).
 */
export type ProfileStatus = 'sports' | 'claimed' | 'verified'

const props = withDefaults(defineProps<{ status?: ProfileStatus }>(), { status: 'sports' })

const view = computed(
  () =>
    ({
      sports: { label: 'Perfil deportivo', icon: IdCard, title: 'Construido con datos oficiales de las competiciones' },
      claimed: { label: 'Perfil reclamado', icon: UserCheck, title: 'El jugador administra este perfil' },
      verified: { label: 'Perfil verificado', icon: BadgeCheck, title: 'Identidad verificada' },
    })[props.status],
)
</script>

<template>
  <span class="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-pitch-100" :title="view.title">
    <component :is="view.icon" class="size-3.5" aria-hidden="true" /> {{ view.label }}
  </span>
</template>
