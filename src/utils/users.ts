import type { User } from '@/types'

export function userDisplayName(user: Pick<User, 'firstName' | 'lastName'>): string {
  return `${user.firstName} ${user.lastName}`.trim()
}
