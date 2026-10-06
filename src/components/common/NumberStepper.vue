<script setup lang="ts">
import { Minus, Plus } from 'lucide-vue-next'

const model = defineModel<number>({ required: true })
const props = withDefaults(defineProps<{ label: string; min?: number; max?: number; size?: 'sm' | 'lg' }>(), {
  min: 0,
  max: 99,
  size: 'sm',
})

function step(delta: number) {
  model.value = Math.min(props.max, Math.max(props.min, model.value + delta))
}
</script>

<template>
  <div class="inline-flex items-center" role="group" :aria-label="label">
    <button
      type="button"
      class="grid place-items-center rounded-full border border-zinc-300 bg-white text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-30"
      :class="size === 'lg' ? 'size-11' : 'size-8'"
      :disabled="model <= min"
      :aria-label="`Restar ${label}`"
      @click="step(-1)"
    >
      <Minus :class="size === 'lg' ? 'size-5' : 'size-3.5'" aria-hidden="true" />
    </button>
    <output
      class="tabular text-center font-display font-bold"
      :class="[size === 'lg' ? 'w-16 text-5xl' : 'w-8 text-xl', model === 0 && size === 'sm' ? 'text-zinc-300' : '']"
      aria-live="polite"
    >
      {{ model }}
    </output>
    <button
      type="button"
      class="grid place-items-center rounded-full border border-zinc-300 bg-white text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-30"
      :class="size === 'lg' ? 'size-11' : 'size-8'"
      :disabled="model >= max"
      :aria-label="`Sumar ${label}`"
      @click="step(1)"
    >
      <Plus :class="size === 'lg' ? 'size-5' : 'size-3.5'" aria-hidden="true" />
    </button>
  </div>
</template>
