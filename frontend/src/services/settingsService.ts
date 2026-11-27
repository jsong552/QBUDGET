import { EmailAuthProvider, reauthenticateWithCredential, sendPasswordResetEmail } from 'firebase/auth'
import { getFirebaseAuth } from '../lib/firebase'
import { apiClient } from '../lib/apiClient'
import { authErrorMessage } from './authService'
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

const wrongPasswordCodes = new Set(['auth/wrong-password', 'auth/invalid-credential', 'auth/invalid-login-credentials'])

/**
 * Permanently deletes the signed-in account and all of its data. Firebase only deletes an account soon after a real
 * sign-in, so the password is confirmed first; the refreshed login token carries that sign-in time to the server.
 * Nothing is sent to the server if the password is blank or wrong.
 */
export async function deleteAccount(password: string): Promise<void> {
  if (!password) throw new Error('Enter your password to confirm.')
  const user = getFirebaseAuth().currentUser
  if (!user?.email) throw new Error('Sign in first.')
  try {
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password))
  } catch (failure) {
    const code = failure && typeof failure === 'object' && 'code' in failure ? String(failure.code) : ''
    throw new Error(wrongPasswordCodes.has(code) ? 'That password is incorrect.' : authErrorMessage(failure), { cause: failure })
  }
  await user.getIdToken(true)
  await apiClient.delete<void>('/me')
}
