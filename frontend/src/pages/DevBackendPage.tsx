import { useState } from 'react'
import { Button } from '../components/Button'
import { getHello } from '../services/healthService'

/** Connection check for the C++ API, at /dev/backend. */
export function DevBackendPage() {
  const [message, setMessage] = useState('Click below to call your C++ API.')
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  async function onTestBackend() {
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
  }

  return (
    <main className="min-h-screen bg-sidebar px-6 py-24 text-on-sidebar">
      <section className="mx-auto max-w-xl rounded-2xl border border-sidebar-raised bg-sidebar-active p-8">
        <p className="text-sm font-semibold tracking-widest text-accent">QBUDGET</p>
        <h1 className="mt-3 text-3xl font-bold">Backend connection check</h1>
        <p className="mt-4 text-on-sidebar-muted">React + TypeScript talking to a C++ HTTP server.</p>
        <Button variant="outline" onClick={onTestBackend} className="mt-8 px-5 py-3">
          {loading ? 'Connecting...' : 'Test C++ backend'}
        </Button>
        <p role="status" className={`mt-6 break-words ${failed ? 'text-danger-soft' : 'text-on-sidebar-muted'}`}>
          {message}
        </p>
      </section>
    </main>
  )
}
