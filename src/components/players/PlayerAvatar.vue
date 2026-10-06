<script setup lang="ts">
import { computed } from 'vue'
import type { Player } from '@/types'
import { fullName } from '@/utils/players'
import { initials } from '@/utils/format'

const props = withDefaults(
  defineProps<{ player: Pick<Player, 'firstName' | 'lastName' | 'photoUrl'> | undefined; size?: 'sm' | 'md' | 'lg' | 'xl'; color?: string; decorative?: boolean }>(),
  { size: 'md', color: undefined },
)

const name = computed(() => (props.player ? fullName(props.player) : 'Jugador'))
const sizeClass = computed(
  () => ({ sm: 'size-8 text-xs', md: 'size-10 text-sm', lg: 'size-16 text-xl', xl: 'size-28 text-4xl sm:size-32' })[props.size],
)
</script>

<template>
  <img
    v-if="player?.photoUrl"
    :src="player.photoUrl"
    :alt="decorative ? '' : `Foto de ${name}`"
    class="shrink-0 rounded-full object-cover"
    :class="sizeClass"
    loading="lazy"
  />
  <span
    v-else
    class="grid shrink-0 place-items-center rounded-full font-display font-bold text-white"
    :class="sizeClass"
    :style="{ backgroundColor: color ?? '#143d2a' }"
    :role="decorative ? undefined : 'img'"
    :aria-label="decorative ? undefined : name"
    :aria-hidden="decorative || undefined"
  >
    {{ initials(name) }}
  </span>
</template>
