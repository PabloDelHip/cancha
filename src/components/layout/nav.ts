import { Home, LayoutDashboard, Medal, Shield, Trophy, Users } from 'lucide-vue-next'
import type { Component } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

export interface NavItem {
  label: string
  to: RouteLocationRaw
  icon: Component
  /** Solo se marca activo en coincidencia exacta. */
  exact?: boolean
  /** Solo para cuentas que pueden organizar torneos. */
  organizerOnly?: boolean
}

export const PUBLIC_NAV: NavItem[] = [
  { label: 'Inicio', to: { name: 'home' }, icon: Home, exact: true },
  { label: 'Ligas', to: { name: 'leagues' }, icon: Medal },
  { label: 'Torneos', to: { name: 'tournaments' }, icon: Trophy },
  { label: 'Jugadores', to: { name: 'players' }, icon: Users },
]

export const ADMIN_NAV: NavItem[] = [
  { label: 'Resumen', to: { name: 'admin-dashboard' }, icon: LayoutDashboard, exact: true },
  { label: 'Mis ligas', to: { name: 'admin-leagues' }, icon: Medal, organizerOnly: true },
  { label: 'Mis torneos', to: { name: 'admin-tournaments' }, icon: Trophy, organizerOnly: true },
  { label: 'Mis equipos', to: { name: 'admin-teams' }, icon: Shield },
]
