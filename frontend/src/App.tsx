import { useState } from 'react'

function App() {
  const [message, setMessage] = useState('Click below to call your C++ API.')
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  async function testBackend() {
    setLoading(true)
    setFailed(false)
    try {
      const baseUrl = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
      const response = await fetch(`${baseUrl}/api/hello`, {
        signal: AbortSignal.timeout(10000),
      })
      if (!response.ok) throw new Error(`API returned HTTP ${response.status}`)
      const data: unknown = await response.json()
      if (!data || typeof data !== 'object' || !('message' in data) || typeof data.message !== 'string') {
        throw new Error('Unexpected API response')
      }
      setMessage(data.message)
    } catch (error) {
      setFailed(true)
      setMessage(`Could not reach the backend. Make sure it is running. ${error instanceof Error ? error.message : ''}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-24 text-slate-100">
      <section className="mx-auto max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-8">
        <p className="text-sm font-semibold tracking-widest text-emerald-400">QBUDGET</p>
        <h1 className="mt-3 text-3xl font-bold">Your backend starts here.</h1>
        <p className="mt-4 text-slate-300">React + TypeScript talking to a C++ HTTP server.</p>
        <button type="button" onClick={testBackend} disabled={loading}
          className="mt-8 rounded-lg bg-emerald-400 px-5 py-3 font-semibold text-slate-950 hover:bg-emerald-300 disabled:opacity-50">
          {loading ? 'Connecting...' : 'Test C++ backend'}
        </button>
        <p role="status" className={`mt-6 break-words ${failed ? 'text-red-300' : 'text-slate-300'}`}>{message}</p>
      </section>
    </main>
  )
}

export default App
