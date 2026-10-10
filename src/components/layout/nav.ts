import { Building2, Home, LayoutDashboard, Medal, Shield, Trophy, UserRound, Users } from 'lucide-vue-next'
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
  /** También para quien solo colabora en torneos ajenos (RBAC). */
  forCollaborators?: boolean
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
  { label: 'Mis torneos', to: { name: 'admin-tournaments' }, icon: Trophy, organizerOnly: true, forCollaborators: true },
  { label: 'Sedes', to: { name: 'admin-venues' }, icon: Building2, organizerOnly: true },
  { label: 'Árbitros', to: { name: 'admin-referees' }, icon: UserRound, organizerOnly: true },
  { label: 'Mis equipos', to: { name: 'admin-teams' }, icon: Shield },
]
