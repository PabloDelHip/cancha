<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import type { TeamInput } from '@/types'
import { getErrorMessage, meService, teamService } from '@/services'
import { useHomeStore, useTeamsStore } from '@/stores'
import { useToast } from '@/composables/useToast'
import { useImageAfterCreate } from '@/composables/useImageAfterCreate'
import BaseModal from '@/components/common/BaseModal.vue'
import AppButton from '@/components/common/AppButton.vue'
import TeamForm from '@/components/teams/TeamForm.vue'

/**
 * Crear MI equipo: quien lo crea queda como su propietario (POST /me/teams). No reclama equipos
 * existentes. Al terminar entra al equipo para armar la plantilla.
 */
defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const router = useRouter()
const toast = useToast()
const home = useHomeStore()
const teams = useTeamsStore()
const attachImage = useImageAfterCreate()
const saving = ref(false)

async function onSubmit(input: TeamInput, logo: Blob | null) {
  saving.value = true
  try {
    const created = await meService.createTeam(input)
    await attachImage(logo, (image) => teamService.uploadLogo(created.id, image))
    toast.success(`${created.name} creado. Ahora eres su propietario.`)
    emit('close')
    void Promise.all([home.ensure(true), teams.ensure(true)]).catch(() => {})
    await router.push({ name: 'admin-team-roster', params: { teamId: created.id } })
  } catch (e) {
    toast.error(getErrorMessage(e))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <BaseModal :open="open" title="Crear mi equipo" description="Quedarás como su propietario: podrás armar la plantilla, sumar delegados e inscribirlo en torneos." size="lg" @close="emit('close')">
    <TeamForm v-if="open" form-id="create-my-team" :initial="null" @submit="onSubmit" />
    <template #footer>
      <AppButton variant="secondary" :disabled="saving" @click="emit('close')">Cancelar</AppButton>
      <AppButton type="submit" form="create-my-team" :loading="saving">Crear equipo</AppButton>
    </template>
  </BaseModal>
</template>
