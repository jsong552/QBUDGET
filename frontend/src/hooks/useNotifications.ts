import { listNotifications } from '../services/notificationService'
import { useAsync } from './useAsync'

export function useNotifications() {
  const [notifications] = useAsync(listNotifications)
  return notifications ?? []
}
