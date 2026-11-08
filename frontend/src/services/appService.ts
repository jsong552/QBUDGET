import { apiClient } from '../lib/apiClient'
export const getTodayLabel = () => apiClient.get<string>('/app/today')
