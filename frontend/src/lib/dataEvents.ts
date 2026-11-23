/** Fired after transactions were created outside the current page, e.g. by the recurring sync on sign-in. */
const generatedTransactionsEvent = 'qbudget:transactions-generated'

export function announceGeneratedTransactions() {
  window.dispatchEvent(new Event(generatedTransactionsEvent))
}

/** Calls `listener` whenever generated transactions are announced. Returns the unsubscribe function. */
export function onGeneratedTransactions(listener: () => void): () => void {
  window.addEventListener(generatedTransactionsEvent, listener)
  return () => window.removeEventListener(generatedTransactionsEvent, listener)
}
