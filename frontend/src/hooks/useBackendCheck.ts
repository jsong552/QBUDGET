import { useCallback, useState } from 'react'
import { getHello } from '../services/healthService'

const idleMessage = 'Click below to call your C++ API.'

/** Live connection check against the C++ API, for /dev/backend. */
export function useBackendCheck() {
  const [message, setMessage] = useState(idleMessage)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  const check = useCallback(async () => {
    setLoading(true)
    setFailed(false)
    try {
      setMessage(await getHello())
    } catch (error) {
      setFailed(true)
      setMessage(`Could not reach the backend. Make sure it is running. ${error instanceof Error ? error.message : ''}`)
    } finally {
      setLoading(false)
    }
  }, [])

  return { message, loading, failed, check }
}
