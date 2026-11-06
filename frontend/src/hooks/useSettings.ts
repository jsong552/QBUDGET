import { getTodayLabel } from '../services/appService'
import { getDisplayPreferences, getNotificationPreferences, getProfile } from '../services/settingsService'
import { useAsync } from './useAsync'

export function useSettings() {
  const [todayLabel] = useAsync(getTodayLabel)
  const [profile] = useAsync(getProfile)
  const [display, setDisplay] = useAsync(getDisplayPreferences)
  const [notifications, setNotifications] = useAsync(getNotificationPreferences)

  return { todayLabel, profile, display, setDisplay, notifications, setNotifications }
}
