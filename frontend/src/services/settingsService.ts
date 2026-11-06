import { mockDisplayPreferences, mockNotificationPreferences, mockUser } from '../data/mockData'
import type { DisplayPreferences, NotificationKey, NotificationPreference, ProfileInput, User } from '../types'
import { mockMutation, mockResponse } from './mock'

// BACKEND: GET /api/me
export function getProfile(): Promise<User> {
  return mockResponse(mockUser)
}

// BACKEND: PUT /api/me
export function updateProfile(input: ProfileInput): Promise<void> {
  return mockMutation('updateProfile', input)
}

// BACKEND: POST /api/me/avatar
export function uploadAvatar(): Promise<void> {
  return mockMutation('uploadAvatar')
}

// BACKEND: GET /api/me/preferences
export function getDisplayPreferences(): Promise<DisplayPreferences> {
  return mockResponse(mockDisplayPreferences)
}

// BACKEND: PATCH /api/me/preferences
export function updateDisplayPreferences(changes: Partial<DisplayPreferences>): Promise<void> {
  return mockMutation('updateDisplayPreferences', changes)
}

// BACKEND: GET /api/me/notification-preferences
export function getNotificationPreferences(): Promise<NotificationPreference[]> {
  return mockResponse(mockNotificationPreferences)
}

// BACKEND: PATCH /api/me/notification-preferences/{key}
export function updateNotificationPreference(key: NotificationKey, enabled: boolean): Promise<void> {
  return mockMutation('updateNotificationPreference', { key, enabled })
}

// BACKEND: POST /api/me/password
export function requestPasswordChange(): Promise<void> {
  return mockMutation('requestPasswordChange')
}

// BACKEND: DELETE /api/me
export function deleteAccount(): Promise<void> {
  return mockMutation('deleteAccount')
}
