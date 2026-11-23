import { useEffect } from 'react'
import { onGeneratedTransactions } from '../lib/dataEvents'

/** Reloads data that is built from transactions when new ones were generated elsewhere (e.g. the recurring sync). */
export function useReloadOnGeneratedTransactions(reload: () => void) {
  useEffect(() => onGeneratedTransactions(reload), [reload])
}
