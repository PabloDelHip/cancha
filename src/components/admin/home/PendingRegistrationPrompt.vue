<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore, useHomeStore } from '@/stores'
import { useRegistrationDrafts } from '@/composables/useRegistrationDrafts'
import BaseModal from '@/components/common/BaseModal.vue'
import AppButton from '@/components/common/AppButton.vue'

/**
 * Al entrar al panel con una inscripción a medias que aún se puede continuar: Continuar (vuelve al
 * enlace, en el paso guardado), Continuar después (queda en el panel; no vuelve a preguntar en esta
 * sesión) o Cancelar (con confirmación; solo descarta el borrador).
 */
const auth = useAuthStore()
const home = useHomeStore()
const route = useRoute()
const drafts = useRegistrationDrafts()
const busy = ref(false)

const draft = computed(() => home.resumable)
const others = computed(() => home.drafts.length - 1)
const open = computed(() => auth.isAuthenticated && home.loaded && !home.promptDismissed && !!draft.value && route.name !== 'join')

async function onContinue() {
  if (!draft.value) return
  home.dismissPrompt()
  await drafts.resume(draft.value)
}
async function onCancel() {
  if (!draft.value) return
  busy.value = true
  try {
    // Si confirma, el aviso pasa a la siguiente inscripción a medias (si la hay).
    await drafts.cancel(draft.value)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <BaseModal :open="open" title="Tienes una inscripción pendiente" @close="home.dismissPrompt()">
    <template v-if="draft">
      <p class="text-zinc-700">
        Estabas registrando a <strong class="text-zinc-950">{{ draft.team?.name ?? 'un equipo' }}</strong> en
        <strong class="text-zinc-950">{{ draft.tournament.name }}</strong>. ¿Qué deseas hacer?
      </p>
      <p v-if="others > 0" class="mt-2 text-sm text-zinc-500">Tienes {{ others }} más sin terminar en tu panel.</p>
    </template>
    <template #footer>
      <AppButton variant="ghost" :disabled="busy" @click="onCancel">Cancelar</AppButton>
      <AppButton variant="secondary" :disabled="busy" @click="home.dismissPrompt()">Continuar después</AppButton>
      <AppButton :disabled="busy" @click="onContinue">Continuar</AppButton>
    </template>
  </BaseModal>
</template>
