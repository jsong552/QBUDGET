import { useCallback } from 'react'
import {
  deleteAccount,
  getDisplayPreferences,
  getNotificationPreferences,
  requestPasswordChange,
  updateDisplayPreferences,
  updateNotificationPreference,
  updateProfile,
  uploadAvatar,
} from '../services/settingsService'
import type { DisplayPreferences, NotificationKey, ProfileInput } from '../types'
import { useAuth } from './useAuth'
import { useAsync } from './useAsync'
import { useMutation } from './useMutation'

/** Settings data. The profile itself is the session user (see useCurrentUser), so the header updates on save. */
export function useSettings() {
  const { updateUser } = useAuth()
  const display = useAsync(getDisplayPreferences)
  const notifications = useAsync(getNotificationPreferences)
  const { run, error: mutationError } = useMutation()

  const setDisplay = display.setData
  const currentDisplay = display.data
  const setNotifications = notifications.setData
  const currentNotifications = notifications.data

  const saveProfile = useCallback((input: ProfileInput) => run(() => updateProfile(input), { onSuccess: updateUser }), [run, updateUser])

  const changeAvatar = useCallback(() => run(uploadAvatar), [run])

  /** Shows the new preferences immediately and restores the previous ones if the request fails. */
  const changeDisplay = useCallback(
    (changes: Partial<DisplayPreferences>) => {
      if (!currentDisplay) return Promise.resolve(false)
      const previous = currentDisplay
      setDisplay({ ...previous, ...changes })
      return run(() => updateDisplayPreferences(changes), { onFailure: () => setDisplay(previous) })
    },
    [run, currentDisplay, setDisplay],
  )

  /** Flips the toggle immediately and flips it back if the request fails. */
  const toggleNotification = useCallback(
    (key: NotificationKey, enabled: boolean) => {
      if (!currentNotifications) return Promise.resolve(false)
      const previous = currentNotifications
      setNotifications(previous.map((item) => (item.key === key ? { ...item, enabled } : item)))
      return run(() => updateNotificationPreference(key, enabled), { onFailure: () => setNotifications(previous) })
    },
    [run, currentNotifications, setNotifications],
  )

  const changePassword = useCallback(() => run(requestPasswordChange), [run])

  const removeAccount = useCallback(() => run(deleteAccount), [run])

  return {
    display: display.data,
    notifications: notifications.data,
    error: display.error ?? notifications.error ?? mutationError,
    saveProfile,
    changeAvatar,
    changeDisplay,
    toggleNotification,
    changePassword,
    removeAccount,
  }
}
