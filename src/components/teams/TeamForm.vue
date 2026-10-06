<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { Team, TeamInput } from '@/types'
import { useFormErrors } from '@/composables/useFormErrors'
import FormField from '@/components/common/FormField.vue'
import ImageUploader from '@/components/media/ImageUploader.vue'
import { useTeamsStore } from '@/stores'
import TeamLogo from './TeamLogo.vue'

/**
 * Ficha maestra del equipo (identidad global). Inscribirlo en torneos es aparte.
 * `restricted` (delegado / MANAGER): nombre y abreviatura quedan bloqueados y solo se emite la
 * presentación (logo, colores, ciudad) en `submitPresentation`. El servidor rechaza cualquier campo
 * de identidad enviado por un MANAGER aunque no cambie, así que ni siquiera se envían.
 */
const props = defineProps<{ initial: Team | null; formId: string; restricted?: boolean }>()
/**
 * El logo NO se escribe como URL: se sube a Cloudinary. Al CREAR, `submit` lleva el logo recortado
 * (quien crea el equipo lo sube después, ya con id). Al EDITAR se sube en el momento y se avisa con
 * `logoChanged` (para quien guarde su propia copia del equipo). El delegado también puede cambiarlo.
 */
const emit = defineEmits<{
  submit: [input: TeamInput, logo: Blob | null]
  submitPresentation: [input: Pick<TeamInput, 'city' | 'colors'>]
  logoChanged: [team: Team]
}>()
const teams = useTeamsStore()

const form = reactive({
  name: props.initial?.name ?? '',
  shortName: props.initial?.shortName ?? '',
  city: props.initial?.city ?? 'Mazatlán, Sin.',
  primary: props.initial?.colors.primary ?? '#15803d',
  secondary: props.initial?.colors.secondary ?? '#fafafa',
})

// Sugiere la abreviatura a partir del nombre mientras el usuario no la edite.
const shortTouched = ref(Boolean(props.initial))
watch(
  () => form.name,
  (name) => {
    if (shortTouched.value) return
    form.shortName = name
      .replace(/\b(FC|CF|Club|Deportivo|de|del|la|los)\b/gi, '')
      .trim()
      .slice(0, 3)
      .toUpperCase()
  },
)

// Logo: equipo existente → subida inmediata; equipo nuevo → borrador que se sube al crearlo.
const logoDraft = ref<Blob | null>(null)
const logoUrl = ref<string | null>(props.initial?.logoUrl ?? null)
const editing = computed(() => props.initial?.id)
async function uploadLogo(image: Blob, onProgress: (p: number) => void) {
  const updated = await teams.setLogo(editing.value!, image, onProgress)
  logoUrl.value = updated.logoUrl
  emit('logoChanged', updated)
}
async function removeLogo() {
  const updated = await teams.removeLogo(editing.value!)
  logoUrl.value = null
  emit('logoChanged', updated)
}

/** Escudo generado con nombre y colores (lo que se ve mientras no haya logo). */
const preview = computed<Team>(() => ({
  id: 'preview',
  name: form.name || 'Equipo',
  shortName: form.shortName || '?',
  logoUrl: null,
  colors: { primary: form.primary, secondary: form.secondary },
  city: null,
  createdAt: '',
  updatedAt: '',
}))

const { errors, set, clear, hasErrors, aria } = useFormErrors<'name' | 'shortName'>()

function onSubmit() {
  clear()
  if (props.restricted) {
    emit('submitPresentation', {
      city: form.city.trim() || null,
      colors: { primary: form.primary, secondary: form.secondary },
    })
    return
  }
  set('name', form.name.trim().length < 2 && 'El nombre es obligatorio.')
  set('shortName', !/^[A-Za-zÁÉÍÓÚÑ0-9]{2,4}$/i.test(form.shortName.trim()) && 'Entre 2 y 4 letras o números.')
  if (hasErrors()) return
  emit(
    'submit',
    {
      name: form.name.trim(),
      shortName: form.shortName.trim().toUpperCase(),
      city: form.city.trim() || null,
      colors: { primary: form.primary, secondary: form.secondary },
    },
    editing.value ? null : logoDraft.value,
  )
}
</script>

<template>
  <form :id="formId" class="grid grid-cols-1 gap-4" novalidate @submit.prevent="onSubmit">
    <ImageUploader
      v-model:draft="logoDraft"
      shape="square"
      title="Logo del equipo"
      :size="512"
      :current-url="logoUrl"
      :upload="editing ? uploadLogo : undefined"
      :remove="editing ? removeLogo : undefined"
    >
      <template #fallback><TeamLogo :team="preview" size="lg" /></template>
    </ImageUploader>
    <p v-if="!logoUrl && !logoDraft" class="-mt-2 text-xs text-zinc-500">Sin logo se muestra un escudo con las iniciales y los colores del equipo.</p>
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_7rem]">
      <FormField id="team-name" label="Nombre" :error="errors.name" :required="!restricted">
        <input id="team-name" v-model="form.name" class="input" placeholder="Halcones FC" :disabled="restricted" v-bind="aria('name', 'team-name')" :autofocus="!restricted" />
      </FormField>
      <FormField id="team-short" label="Abreviatura" :error="errors.shortName" :required="!restricted">
        <input id="team-short" v-model="form.shortName" class="input uppercase" maxlength="4" :disabled="restricted" v-bind="aria('shortName', 'team-short')" @input="shortTouched = true" />
      </FormField>
      <p v-if="restricted" class="-mt-2 text-xs text-zinc-500 sm:col-span-2">Solo el propietario puede cambiar el nombre y la abreviatura.</p>
      <FormField id="team-city" label="Ciudad">
        <input id="team-city" v-model="form.city" class="input" />
      </FormField>
      <div class="flex gap-3">
        <FormField id="team-c1" label="Color 1">
          <input id="team-c1" v-model="form.primary" type="color" class="h-10 w-12 cursor-pointer rounded-lg border border-zinc-300 bg-white p-1" />
        </FormField>
        <FormField id="team-c2" label="Color 2">
          <input id="team-c2" v-model="form.secondary" type="color" class="h-10 w-12 cursor-pointer rounded-lg border border-zinc-300 bg-white p-1" />
        </FormField>
      </div>
    </div>
  </form>
</template>
