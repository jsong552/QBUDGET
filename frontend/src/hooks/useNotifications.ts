import { listNotifications } from '../services/notificationService'
import { useAsync } from './useAsync'

export function useNotifications() {
  return useAsync(listNotifications).data ?? []
}
