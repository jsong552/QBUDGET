import { getTodayLabel } from '../services/appService'
import { useAsync } from './useAsync'

/** Server "today" label shown above every page title. */
export function useTodayLabel() {
  return useAsync(getTodayLabel).data
}
