import { sendPasswordResetEmail } from 'firebase/auth'
import { getFirebaseAuth } from '../lib/firebase'
import { apiClient } from '../lib/apiClient'
import type { DisplayPreferences, NotificationKey, NotificationPreference, ProfileInput, User } from '../types'
export const updateProfile = (input: ProfileInput) => apiClient.put<User>('/me', input)
export const getDisplayPreferences = () => apiClient.get<DisplayPreferences>('/me/preferences')
export const updateDisplayPreferences = (changes: Partial<DisplayPreferences>) => apiClient.patch<void>('/me/preferences', changes)
export const getNotificationPreferences = () => apiClient.get<NotificationPreference[]>('/me/notification-preferences')
export const updateNotificationPreference = (key: NotificationKey, enabled: boolean) => apiClient.patch<void>(`/me/notification-preferences/${encodeURIComponent(key)}`, { enabled })
export async function requestPasswordChange(): Promise<void> {
  const auth = getFirebaseAuth()
  if (!auth.currentUser?.email) throw new Error('Sign in first.')
  await sendPasswordResetEmail(auth, auth.currentUser.email)
}
export async function uploadAvatar(): Promise<void> { throw new Error('Avatar uploads are not available yet.') }
export async function deleteAccount(): Promise<void> { throw new Error('Account deletion is not available yet.') }
