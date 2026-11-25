import { useCallback } from 'react'
import { forgetStoredDateFormat } from '../lib/dateFormat'
import { forgetStoredTheme } from '../lib/theme'
import {
  deleteAccount as deleteAccountAndData,
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
import { useDisplayPreferences } from './useDisplayPreferences'
import { useMutation } from './useMutation'

/**
 * Settings data. The profile itself is the session user (see useCurrentUser), so the header updates on save.
 * Display preferences are the app-wide copy (see DisplayPreferencesProvider), so a new theme shows on every page at once.
 */
export function useSettings() {
  const { updateUser, signOut } = useAuth()
  const display = useDisplayPreferences()
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

  /**
   * Deletes the account and all its data, forgets this device's theme and date format, then signs out.
   * Rejects with a message for the dialog if the password is wrong or the deletion fails (it can then be retried).
   */
  const deleteAccount = useCallback(
    async (password: string) => {
      await deleteAccountAndData(password)
      forgetStoredTheme()
      forgetStoredDateFormat()
      await signOut()
    },
    [signOut],
  )

  return {
    display: display.data,
    notifications: notifications.data,
    error: display.error ?? notifications.error ?? mutationError,
    saveProfile,
    changeAvatar,
    changeDisplay,
    toggleNotification,
    changePassword,
    deleteAccount,
  }
}
