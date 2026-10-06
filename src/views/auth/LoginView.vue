<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import posthog from 'posthog-js'
import { analyticsEnabled as posthogConfigured } from '@/services/analytics'
import { AlertCircle } from 'lucide-vue-next'
import { useAuthStore } from '@/stores'
import { getErrorMessage, getErrorStatus, USE_MOCKS } from '@/services'
import { safeRedirect } from '@/router'
import { useFormErrors } from '@/composables/useFormErrors'
import AuthShell from '@/components/auth/AuthShell.vue'
import PasswordInput from '@/components/auth/PasswordInput.vue'
import FormField from '@/components/common/FormField.vue'
import AppButton from '@/components/common/AppButton.vue'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const form = reactive({ email: '', password: '' })
const error = ref<string | null>(null)
const { errors, set, clear, hasErrors, aria } = useFormErrors<'email' | 'password'>()
const showDemo = import.meta.env.DEV || USE_MOCKS

async function onSubmit() {
  clear()
  error.value = null
  set('email', !/^\S+@\S+\.\S+$/.test(form.email.trim()) && 'Escribe un email válido.')
  set('password', !form.password && 'Escribe tu contraseña.')
  if (hasErrors()) return
  try {
    await auth.login({ email: form.email.trim(), password: form.password })
    if (posthogConfigured) posthog.capture('user_logged_in')
    await router.replace(safeRedirect(route.query.redirect))
  } catch (e) {
    const status = getErrorStatus(e)
    error.value = status === 401 ? 'Email o contraseña incorrectos.' : getErrorMessage(e)
    form.password = ''
  }
}

// Cuentas demo descritas por lo que HACEN (una persona puede tener varios roles), no por un tipo de
// cuenta. Pablo y Carlos solo existen en el seed del backend (roles de equipo requieren servidor).
const demoAccounts = [
  { email: 'demo@cancha.local', label: 'Laura · organiza ligas de Cancún' },
  { email: 'organizador2@cancha.local', label: 'Mariana · organiza la Liga Cancún' },
  ...(USE_MOCKS
    ? []
    : [
        { email: 'pablo@cancha.local', label: 'Pablo · propietario de Halcones, delegado de Tigres' },
        { email: 'carlos@cancha.local', label: 'Carlos · delegado de Halcones (no es jugador)' },
      ]),
]

function useDemo(email: string) {
  form.email = email
  form.password = 'Demo12345'
}
</script>

<template>
  <AuthShell title="Iniciar sesión" subtitle="Accede al panel para administrar tus torneos.">
    <form class="space-y-5" novalidate @submit.prevent="onSubmit">
      <div v-if="error" role="alert" class="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 ring-1 ring-red-200 ring-inset">
        <AlertCircle class="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {{ error }}
      </div>

      <FormField id="login-email" label="Email" :error="errors.email">
        <input id="login-email" v-model="form.email" type="email" autocomplete="email" inputmode="email" class="input h-11" v-bind="aria('email', 'login-email')" autofocus />
      </FormField>

      <FormField id="login-password" label="Contraseña" :error="errors.password">
        <PasswordInput
          id="login-password"
          v-model="form.password"
          autocomplete="current-password"
          :invalid="!!errors.password"
          :described-by="errors.password ? 'login-password-error' : undefined"
        />
      </FormField>

      <AppButton type="submit" class="h-11 w-full" :loading="auth.loading">Iniciar sesión</AppButton>
    </form>

    <p class="mt-6 text-center text-sm text-zinc-600">
      ¿Aún no tienes cuenta?
      <RouterLink :to="{ name: 'register', query: route.query }" class="link">Crear cuenta</RouterLink>
    </p>

    <div v-if="showDemo" class="mt-8 rounded-xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-600">
      <p class="font-semibold text-zinc-800">Cuentas demo (solo desarrollo)</p>
      <ul class="mt-2 space-y-1.5">
        <li v-for="d in demoAccounts" :key="d.email" class="flex items-center justify-between gap-2">
          <span class="min-w-0"><span class="block truncate">{{ d.email }}</span><span class="text-xs text-zinc-500">{{ d.label }}</span></span>
          <button type="button" class="link shrink-0 text-sm" @click="useDemo(d.email)">Usar</button>
        </li>
      </ul>
      <p class="mt-2 text-xs text-zinc-500">Contraseña: Demo12345</p>
    </div>
  </AuthShell>
</template>
