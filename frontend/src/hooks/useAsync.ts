import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react'

export interface AsyncResource<T> {
  /** Latest successful result. Kept while reloading and after a failed reload. */
  data: T | undefined
  /** Error from the last load, or null. */
  error: unknown
  /** Runs the load again (e.g. after a mutation). */
  reload: () => void
  /** Local update, for showing a change before the request finishes. */
  setData: Dispatch<SetStateAction<T | undefined>>
}

/**
 * Runs `load` on mount, whenever it changes, and on `reload()`.
 * `load` must be stable (a module function or wrapped in useCallback).
 */
export function useAsync<T>(load: () => Promise<T>): AsyncResource<T> {
  const [data, setData] = useState<T>()
  const [error, setError] = useState<unknown>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let active = true
    load().then(
      (result) => {
        if (!active) return
        setData(result)
        setError(null)
      },
      (failure: unknown) => {
        if (!active) return
        console.error('[data] load failed', failure)
        setError(failure)
      },
    )
    return () => {
      active = false
    }
  }, [load, version])

  const reload = useCallback(() => setVersion((current) => current + 1), [])

  return { data, error, reload, setData }
}
