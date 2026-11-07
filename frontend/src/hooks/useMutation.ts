import { useCallback, useState } from 'react'

interface MutationCallbacks<T> {
  /** Runs after a successful request, e.g. to reload affected data. */
  onSuccess?: (result: T) => void
  /** Runs after a failed request, e.g. to roll back a change already shown on screen. */
  onFailure?: () => void
}

/**
 * Runs write requests without ever rejecting. Failures are logged and exposed as `error`.
 * `run` resolves to true on success, false on failure.
 */
export function useMutation() {
  const [error, setError] = useState<unknown>(null)

  const run = useCallback(async <T>(action: () => Promise<T>, { onSuccess, onFailure }: MutationCallbacks<T> = {}): Promise<boolean> => {
    try {
      const result = await action()
      setError(null)
      onSuccess?.(result)
      return true
    } catch (failure) {
      console.error('[data] request failed', failure)
      setError(failure)
      onFailure?.()
      return false
    }
  }, [])

  return { run, error }
}
