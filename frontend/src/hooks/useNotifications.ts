import { useEffect } from 'react'
import { listNotifications } from '../services/notificationService'
import { useAsync } from './useAsync'

export function useNotifications() {
  const { data, reload } = useAsync(listNotifications)
  useEffect(() => {
    window.addEventListener('qbudget:data-changed', reload)
    window.addEventListener('focus', reload)
    const timer = window.setInterval(reload, 60000)
    return () => {
      window.removeEventListener('qbudget:data-changed', reload)
      window.removeEventListener('focus', reload)
      window.clearInterval(timer)
    }
  }, [reload])
  return data ?? []
}
