import { mockNotifications } from '../data/mockData'
import type { AppNotification } from '../types'
import { mockResponse } from './mock'

// BACKEND: GET /api/notifications
export function listNotifications(): Promise<AppNotification[]> {
  return mockResponse(mockNotifications)
}
