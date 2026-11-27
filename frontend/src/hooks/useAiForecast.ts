import { useCallback, useEffect, useRef, useState } from 'react'
import { generateAiForecast, getAiForecastStatus, type AiForecast } from '../services/aiForecastService'
import { onGeneratedTransactions } from '../lib/dataEvents'
import { useAsync } from './useAsync'

export function useAiForecast() {
  const status = useAsync(getAiForecastStatus)
  const [data, setData] = useState<AiForecast>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [selected, setSelected] = useState(true)
  const version = useRef(0)
  const pending = useRef(false)
  useEffect(() => {
    const abandonResponse = () => { version.current++ }
    const invalidate = () => {
      abandonResponse()
      pending.current = false
      setData(undefined)
      setError(null)
      setBusy(false)
    }
    // A saved goal, payment or transaction makes the old forecast stale, including an in-flight response.
    window.addEventListener('qbudget:data-changed', invalidate)
    const unsubscribe = onGeneratedTransactions(invalidate)
    return () => {
      abandonResponse()
      window.removeEventListener('qbudget:data-changed', invalidate)
      unsubscribe()
    }
  }, [])
  const generate = useCallback(async () => {
    if (pending.current) return
    pending.current = true
    const request = ++version.current
    setBusy(true)
    setError(null)
    try {
      const result = await generateAiForecast()
      if (request === version.current) { setData(result); setSelected(true) }
    } catch (failure) {
      if (request === version.current) { setError(failure); setData(undefined) }
    } finally {
      if (request === version.current) { pending.current = false; setBusy(false) }
    }
  }, [])
  return { data, busy, error, generate, selected, setSelected,
    enabled: status.data?.enabled ?? false, statusError: status.error,
    checking: !status.data && !status.error, retryStatus: status.reload }
}
