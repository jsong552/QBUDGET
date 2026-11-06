import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'

/**
 * Runs `load` on mount and whenever it changes, returning the latest result.
 * `load` must be stable (a module function or wrapped in useCallback).
 * The setter allows optimistic local updates after a mutation.
 */
export function useAsync<T>(load: () => Promise<T>): [T | undefined, Dispatch<SetStateAction<T | undefined>>] {
  const [data, setData] = useState<T>()

  useEffect(() => {
    let active = true
    load().then((result) => {
      if (active) setData(result)
    })
    return () => {
      active = false
    }
  }, [load])

  return [data, setData]
}
