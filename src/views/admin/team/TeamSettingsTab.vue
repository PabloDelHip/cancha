<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Save, Trash2 } from 'lucide-vue-next'
import type { Team, TeamInput } from '@/types'
import { teamService } from '@/services'
import { useTeamsStore } from '@/stores'
import { useTeamManagement } from '@/composables/useTeamManagement'
import { useConfirm } from '@/composables/useConfirm'
import { useToast } from '@/composables/useToast'
import AppButton from '@/components/common/AppButton.vue'
import TeamForm from '@/components/teams/TeamForm.vue'
import TeamCoverEditor from '@/components/teams/TeamCoverEditor.vue'

/**
 * Ficha global del equipo con el formulario de siempre (TeamForm):
 * - Propietario: todo (nombre, abreviatura, logo, colores, ciudad) y eliminar (solo sin historia).
 * - Delegado: solo presentación (logo, colores, ciudad); nombre y abreviatura bloqueados.
 * El logo es una URL (no hay subida de archivos todavía).
 */
const { team, teamId, isOwner, myRole, actionFailed } = useTeamManagement()
const teams = useTeamsStore()
const router = useRouter()
const { confirm } = useConfirm()
const toast = useToast()
const saving = ref(false)
const formKey = ref(0)

async function save(input: Partial<TeamInput>) {
  saving.value = true
  try {
    const updated = await teamService.update(teamId(), input)
    team.value = updated
    // Si el panel ya tenía el equipo en memoria (torneos), que vea el cambio sin recargar.
    if (teams.get(updated.id)) teams.items = teams.items.map((t) => (t.id === updated.id ? updated : t))
    formKey.value++
    toast.success('Cambios guardados.')
  } catch (e) {
    toast.error(await actionFailed(e))
  } finally {
    saving.value = false
  }
}

/** Logo y portada se suben a Cloudinary desde su propio control: aquí solo se refleja el cambio. */
function onLogoChanged(updated: Team) {
  team.value = updated
  if (teams.get(updated.id)) teams.items = teams.items.map((t) => (t.id === updated.id ? updated : t))
}

async function remove() {
  const ok = await confirm({
    title: `¿Eliminar ${team.value?.name}?`,
    message:
      'Solo es posible si el equipo no tiene historia: sin partidos, sin jugadores en torneos, sin jugadores en su plantilla y sin inscripciones en torneos finalizados o de otros organizadores. Si no se cumple, no se borra nada.',
    confirmLabel: 'Eliminar equipo',
    tone: 'danger',
  })
  if (!ok) return
  try {
    await teamService.remove(teamId())
    toast.success('Equipo eliminado.')
    await router.push({ name: 'admin-teams' })
  } catch (e) {
    toast.error(await actionFailed(e))
  }
}
</script>

<template>
  <div class="space-y-8">
    <section aria-labelledby="identity-title" class="card p-4 sm:p-5">
      <h2 id="identity-title" class="text-lg font-bold">Ficha del equipo</h2>
      <p class="mb-4 text-sm text-zinc-500">
        {{ myRole === 'owner' ? 'Cómo se ve el equipo en toda Cancha: perfil público, torneos e historial.' : 'Como delegado puedes cambiar la presentación del equipo.' }}
      </p>
      <TeamForm
        v-if="team"
        :key="formKey"
        form-id="team-settings-form"
        :initial="team"
        :restricted="!isOwner"
        @submit="save"
        @submit-presentation="save"
        @logo-changed="onLogoChanged"
      />
      <div class="mt-4 flex justify-end">
        <AppButton type="submit" form="team-settings-form" :loading="saving"><Save class="size-4" aria-hidden="true" /> Guardar cambios</AppButton>
      </div>
    </section>

    <section v-if="team" aria-labelledby="cover-title" class="card p-4 sm:p-5">
      <h2 id="cover-title" class="text-lg font-bold">Foto de portada</h2>
      <p class="mb-4 text-sm text-zinc-500">La foto grande del perfil del equipo. Súbela y arrástrala para elegir qué parte se ve.</p>
      <TeamCoverEditor :team="team" @changed="onLogoChanged" />
    </section>

    <section v-if="isOwner" aria-labelledby="danger-title" class="rounded-2xl border border-red-200 bg-red-50/40 p-4 sm:p-5">
      <h2 id="danger-title" class="font-bold text-red-900">Eliminar equipo</h2>
      <p class="mt-1 mb-3 text-sm text-red-900/80">Solo se puede eliminar un equipo sin historia. Si tiene partidos, jugadores o inscripciones que lo impidan, verás el motivo y no se borrará nada.</p>
      <AppButton variant="danger" @click="remove"><Trash2 class="size-4" aria-hidden="true" /> Eliminar equipo</AppButton>
    </section>
  </div>
</template>
