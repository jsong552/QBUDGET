import { mockTodayLabel } from '../data/mockData'
import { mockResponse } from './mock'

// BACKEND: GET /api/app/today (server date, so all screens agree on "today")
export function getTodayLabel(): Promise<string> {
  return mockResponse(mockTodayLabel)
}
