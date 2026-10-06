<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import type { Player, PlayerInput, PlayerPosition } from '@/types'
import { POSITION_LABELS, POSITION_ORDER } from '@/utils/labels'
import { toISODate } from '@/utils/format'
import { useFormErrors } from '@/composables/useFormErrors'
import { usePlayersStore } from '@/stores'
import FormField from '@/components/common/FormField.vue'
import ImageUploader from '@/components/media/ImageUploader.vue'
import PlayerAvatar from './PlayerAvatar.vue'

/** Ficha maestra del jugador (identidad global). El registro en torneos es aparte. */
/** `prefill`: nombre sugerido para una ficha nueva (p. ej. lo que se buscó antes de crearla). */
const props = defineProps<{ initial: Player | null; formId: string; prefill?: { firstName: string; lastName: string } }>()
/**
 * `submit` lleva la foto recortada solo al CREAR (aún no hay id): quien crea la ficha la sube después.
 * Al EDITAR, la foto se sube a Cloudinary en el momento (no depende del botón Guardar).
 */
const emit = defineEmits<{ submit: [input: PlayerInput, photo: Blob | null] }>()

// Solo se edita una ficha con canEdit, y canEdit llega junto con su fecha exacta (listMine,
// create/update): el formulario nunca envía null por no conocerla.
const players = usePlayersStore()
const form = reactive({
  firstName: props.initial?.firstName ?? props.prefill?.firstName ?? '',
  lastName: props.initial?.lastName ?? props.prefill?.lastName ?? '',
  nickname: props.initial?.nickname ?? '',
  // La fecha exacta no viaja en la ficha pública: solo la tiene el custodio (store).
  birthDate: (props.initial && players.birthDateOf(props.initial.id)) ?? '',
  position: (props.initial?.position ?? 'MID') as PlayerPosition,
})

// Quien edita sin conocer la fecha (el equipo: es privada) no la envía si la deja vacía: se conserva.
const hiddenBirthDate = computed(() => !!props.initial && !players.knowsBirthDate(props.initial.id))
const birthHint = computed(() => (hiddenBirthDate.value && props.initial?.age != null ? 'Ya tiene una registrada (privada). Déjala vacía para conservarla.' : 'Opcional'))

// Foto: ficha existente → subida inmediata (store); ficha nueva → borrador que se sube al crearla.
const photoDraft = ref<Blob | null>(null)
const editing = computed(() => props.initial?.id)
const currentPhoto = computed(() => {
  if (!editing.value) return null
  const stored = players.get(editing.value) // tras subir/quitar, el store tiene la URL vigente (o null)
  return stored ? stored.photoUrl : (props.initial?.photoUrl ?? null)
})
const uploadPhoto = (image: Blob, onProgress: (p: number) => void) => players.setPhoto(editing.value!, image, onProgress)
const removePhoto = () => players.removePhoto(editing.value!)
const avatarPreview = computed(() => ({ firstName: form.firstName || '?', lastName: form.lastName, photoUrl: null }))

const today = toISODate(new Date())
const { errors, set, clear, hasErrors, aria } = useFormErrors<'firstName' | 'lastName' | 'birthDate'>()

function onSubmit() {
  clear()
  set('firstName', !form.firstName.trim() && 'El nombre es obligatorio.')
  set('lastName', !form.lastName.trim() && 'Los apellidos son obligatorios.')
  set('birthDate', form.birthDate > today && 'La fecha no puede ser futura.')
  if (hasErrors()) return

  emit(
    'submit',
    {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      nickname: form.nickname.trim() || null,
      birthDate: form.birthDate || (hiddenBirthDate.value ? undefined : null),
      position: form.position,
    },
    editing.value ? null : photoDraft.value,
  )
}
</script>

<template>
  <form :id="formId" class="grid grid-cols-1 gap-4 sm:grid-cols-2" novalidate @submit.prevent="onSubmit">
    <ImageUploader
      v-model:draft="photoDraft"
      class="sm:col-span-2"
      shape="circle"
      title="Foto del jugador"
      :size="800"
      :current-url="currentPhoto"
      :upload="editing ? uploadPhoto : undefined"
      :remove="editing ? removePhoto : undefined"
    >
      <template #fallback><PlayerAvatar :player="avatarPreview" size="xl" decorative class="!size-full" /></template>
    </ImageUploader>

    <FormField id="pl-first" label="Nombre" :error="errors.firstName" required>
      <input id="pl-first" v-model="form.firstName" class="input" autocomplete="off" v-bind="aria('firstName', 'pl-first')" autofocus />
    </FormField>
    <FormField id="pl-last" label="Apellidos" :error="errors.lastName" required>
      <input id="pl-last" v-model="form.lastName" class="input" autocomplete="off" v-bind="aria('lastName', 'pl-last')" />
    </FormField>
    <FormField id="pl-nick" label="Apodo" hint="Opcional · así lo conocen en la cancha (ej. Bigotes)" class="sm:col-span-2">
      <input id="pl-nick" v-model="form.nickname" class="input" maxlength="40" autocomplete="off" placeholder="Bigotes" />
    </FormField>
    <FormField id="pl-birth" label="Fecha de nacimiento" :error="errors.birthDate" :hint="birthHint">
      <input id="pl-birth" v-model="form.birthDate" type="date" :max="today" class="input" v-bind="aria('birthDate', 'pl-birth')" />
    </FormField>
    <FormField id="pl-position" label="Posición" required>
      <select id="pl-position" v-model="form.position" class="input">
        <option v-for="p in POSITION_ORDER" :key="p" :value="p">{{ POSITION_LABELS[p] }}</option>
      </select>
    </FormField>

  </form>
</template>
