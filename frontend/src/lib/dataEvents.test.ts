import { afterEach, expect, it, vi } from 'vitest'
import { announceGeneratedTransactions, onGeneratedTransactions } from './dataEvents'

afterEach(() => { vi.unstubAllGlobals() })

it('notifies listeners about generated transactions until they unsubscribe', () => {
  vi.stubGlobal('window', new EventTarget())
  const reload = vi.fn()
  const unsubscribe = onGeneratedTransactions(reload)
  announceGeneratedTransactions()
  expect(reload).toHaveBeenCalledTimes(1)
  unsubscribe()
  announceGeneratedTransactions()
  expect(reload).toHaveBeenCalledTimes(1)
})
