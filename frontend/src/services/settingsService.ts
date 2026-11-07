import { mockDisplayPreferences, mockNotificationPreferences, mockUser } from '../data/mockData'
import type { DisplayPreferences, NotificationKey, NotificationPreference, ProfileInput, User } from '../types'
import { mockMutation, mockResponse } from './mock'

// BACKEND: PUT /api/me (returns the updated user)
export async function updateProfile(input: ProfileInput): Promise<User> {
  await mockMutation('updateProfile', input)
  const names = input.fullName.trim().split(/\s+/)
  return {
    ...mockUser,
    fullName: input.fullName,
    firstName: names[0] ?? '',
    initials: names.map((name) => name[0]?.toUpperCase() ?? '').join('').slice(0, 2),
    studentId: input.studentId,
  }
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
