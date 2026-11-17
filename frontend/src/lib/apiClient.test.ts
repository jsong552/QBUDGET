import { afterEach, expect, it, vi } from 'vitest'
import { apiClient, setAuthTokenProvider } from './apiClient'

afterEach(() => { setAuthTokenProvider(null); vi.unstubAllGlobals() })
it('sends the latest bearer token, and omits authorization when signed out', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
  vi.stubGlobal('fetch', fetch)
  const provider = vi.fn().mockResolvedValueOnce('first').mockResolvedValueOnce('refreshed').mockResolvedValueOnce(null)
  setAuthTokenProvider(provider)
  await apiClient.get('/me')
  await apiClient.get('/me')
  await apiClient.get('/hello')
  expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer first')
  expect(fetch.mock.calls[1][1].headers.Authorization).toBe('Bearer refreshed')
  expect(fetch.mock.calls[2][1].headers).not.toHaveProperty('Authorization')
})
it('does not send a request when retrieving an auth token fails', async () => {
  const fetch = vi.fn()
  vi.stubGlobal('fetch', fetch)
  setAuthTokenProvider(async () => { throw new Error('Token unavailable') })
  await expect(apiClient.get('/me')).rejects.toThrow('Token unavailable')
  expect(fetch).not.toHaveBeenCalled()
})
