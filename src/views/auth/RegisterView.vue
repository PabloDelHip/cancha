<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import posthog from 'posthog-js'
import { analyticsEnabled as posthogConfigured } from '@/services/analytics'
import { AlertCircle } from 'lucide-vue-next'
import { useAuthStore } from '@/stores'
import { getErrorMessage, getErrorStatus, meService } from '@/services'
import { safeRedirect } from '@/router'
import { useFormErrors } from '@/composables/useFormErrors'
import AuthShell from '@/components/auth/AuthShell.vue'
import PasswordInput from '@/components/auth/PasswordInput.vue'
import FormField from '@/components/common/FormField.vue'
import AppButton from '@/components/common/AppButton.vue'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const form = reactive({ firstName: '', lastName: '', email: '', password: '', confirm: '' })
const error = ref<string | null>(null)
const { errors, set, clear, hasErrors, aria } = useFormErrors<'firstName' | 'lastName' | 'email' | 'password' | 'confirm'>()

async function onSubmit() {
  clear()
  error.value = null
  set('firstName', !form.firstName.trim() && 'Escribe tu nombre.')
  set('lastName', !form.lastName.trim() && 'Escribe tu apellido.')
  set('email', !/^\S+@\S+\.\S+$/.test(form.email.trim()) && 'Escribe un email válido.')
  set('password', form.password.length < 8 && 'Usa al menos 8 caracteres.')
  set('confirm', form.confirm !== form.password && 'Las contraseñas no coinciden.')
  if (hasErrors()) return
  try {
    await auth.register({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      password: form.password,
    })
    if (posthogConfigured) posthog.capture('user_registered')
    // Llegó desde "Organiza tu torneo": la cuenta nace pudiendo organizar (si falla, lo activa en el panel).
    if (route.query.intent === 'organizer') await meService.enableOrganizer().catch(() => {})
    await router.replace(safeRedirect(route.query.redirect))
  } catch (e) {
    if (getErrorStatus(e) === 409) set('email', 'Ya existe una cuenta con ese email.')
    else error.value = getErrorMessage(e)
  }
}
</script>

<template>
  <AuthShell title="Crear cuenta" subtitle="Una sola cuenta para organizar torneos y administrar tus equipos.">
    <form class="space-y-5" novalidate @submit.prevent="onSubmit">
      <div v-if="error" role="alert" class="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 ring-1 ring-red-200 ring-inset">
        <AlertCircle class="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {{ error }}
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField id="reg-first" label="Nombre" :error="errors.firstName">
          <input id="reg-first" v-model="form.firstName" autocomplete="given-name" class="input h-11" v-bind="aria('firstName', 'reg-first')" autofocus />
        </FormField>
        <FormField id="reg-last" label="Apellido" :error="errors.lastName">
          <input id="reg-last" v-model="form.lastName" autocomplete="family-name" class="input h-11" v-bind="aria('lastName', 'reg-last')" />
        </FormField>
      </div>

      <FormField id="reg-email" label="Email" :error="errors.email">
        <input id="reg-email" v-model="form.email" type="email" autocomplete="email" inputmode="email" class="input h-11" v-bind="aria('email', 'reg-email')" />
      </FormField>

      <FormField id="reg-password" label="Contraseña" :error="errors.password" hint="Mínimo 8 caracteres.">
        <PasswordInput
          id="reg-password"
          v-model="form.password"
          autocomplete="new-password"
          :invalid="!!errors.password"
          :described-by="errors.password ? 'reg-password-error' : 'reg-password-hint'"
        />
      </FormField>

      <FormField id="reg-confirm" label="Confirmar contraseña" :error="errors.confirm">
        <PasswordInput
          id="reg-confirm"
          v-model="form.confirm"
          autocomplete="new-password"
          :invalid="!!errors.confirm"
          :described-by="errors.confirm ? 'reg-confirm-error' : undefined"
        />
      </FormField>

      <AppButton type="submit" class="h-11 w-full" :loading="auth.loading">Crear cuenta</AppButton>
    </form>

    <p class="mt-6 text-center text-sm text-zinc-600">
      ¿Ya tienes cuenta?
      <RouterLink :to="{ name: 'login', query: route.query }" class="link">Iniciar sesión</RouterLink>
    </p>
  </AuthShell>
</template>
