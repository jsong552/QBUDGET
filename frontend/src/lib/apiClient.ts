const baseUrl = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

/**
 * Ask Firebase for a current ID token on every request, refreshing when needed.
 * The C++ API must implement verification before exposing protected data.
 */
let tokenProvider: (() => Promise<string | null>) | null = null

export function setAuthTokenProvider(provider: (() => Promise<string | null>) | null) {
  tokenProvider = provider
}

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

interface RequestOptions {
  method?: HttpMethod
  body?: unknown
  timeoutMs?: number
}

/**
 * Single entry point for calls to the QBudget API.
 * `path` is relative to `/api`, e.g. `apiRequest('/transactions')`.
 */
export async function apiRequest<T>(path: string, { method = 'GET', body, timeoutMs = 60000 }: RequestOptions = {}): Promise<T> {
  const authToken = await tokenProvider?.()
  const response = await fetch(`${baseUrl}/api${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: unknown } | null
    throw new ApiError(response.status, typeof payload?.error === 'string' ? payload.error : `API returned HTTP ${response.status}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export const apiClient = {
  get: <T>(path: string) => apiRequest<T>(path),
  post: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: 'DELETE' }),
}
