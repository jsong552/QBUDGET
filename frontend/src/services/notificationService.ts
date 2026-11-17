import { apiClient } from '../lib/apiClient'
import type { AppNotification } from '../types'
export const listNotifications = () => apiClient.get<AppNotification[]>('/notifications')
