import { apiClient } from '../lib/apiClient'

interface HelloResponse {
  message: string
}

/** Calls the running C++ API. This is a live request, not mock data. */
// BACKEND: GET /api/hello
export async function getHello(): Promise<string> {
  const data = await apiClient.get<unknown>('/hello')
  if (!data || typeof data !== 'object' || !('message' in data) || typeof (data as HelloResponse).message !== 'string') {
    throw new Error('Unexpected API response')
  }
  return (data as HelloResponse).message
}
