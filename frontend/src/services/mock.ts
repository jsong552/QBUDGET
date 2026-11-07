/** Resolves with a copy of `data` after a short delay, standing in for a network call. */
export function mockResponse<T>(data: T, delayMs = 150): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(structuredClone(data)), delayMs)
  })
}

/** Logs a write that the API will handle, then resolves. */
export function mockMutation(action: string, payload?: unknown): Promise<void> {
  console.info(`[mock] ${action}`, payload ?? '')
  return mockResponse(undefined)
}
