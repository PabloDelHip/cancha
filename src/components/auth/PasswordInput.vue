<script setup lang="ts">
import { ref } from 'vue'
import { Eye, EyeOff } from 'lucide-vue-next'

const model = defineModel<string>({ required: true })
defineProps<{ id: string; autocomplete: 'current-password' | 'new-password'; invalid?: boolean; describedBy?: string }>()

const visible = ref(false)
</script>

<template>
  <div class="relative">
    <input
      :id="id"
      v-model="model"
      :type="visible ? 'text' : 'password'"
      :autocomplete="autocomplete"
      class="input h-11 pr-11"
      :aria-invalid="invalid || undefined"
      :aria-describedby="describedBy"
    />
    <button
      type="button"
      class="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-lg text-zinc-400 hover:text-zinc-700"
      :aria-label="visible ? 'Ocultar contraseña' : 'Mostrar contraseña'"
      :aria-pressed="visible"
      @click="visible = !visible"
    >
      <EyeOff v-if="visible" class="size-4.5" aria-hidden="true" />
      <Eye v-else class="size-4.5" aria-hidden="true" />
    </button>
  </div>
</template>
