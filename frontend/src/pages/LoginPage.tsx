import { CalendarDays, ChartNoAxesColumnIncreasing, LockKeyhole, Mail, Target, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { Navigate } from 'react-router'
import { authErrorMessage } from '../services/authService'
import { Button } from '../components/Button'
import { LoginIllustration } from '../components/LoginIllustration'
import { Logo } from '../components/Logo'
import { TextField } from '../components/TextField'
import { useAuth } from '../hooks/useAuth'

type AuthMode = 'signIn' | 'signUp'

interface Feature {
  icon: LucideIcon
  iconClass: string
  title: string
  description: string
}

const features: Feature[] = [
  { icon: ChartNoAxesColumnIncreasing, iconClass: 'bg-info text-on-primary', title: 'Track your spending', description: 'See where your money goes' },
  { icon: Target, iconClass: 'bg-accent text-on-primary', title: 'Set financial goals', description: 'Plan for your semester and beyond' },
  { icon: CalendarDays, iconClass: 'bg-danger text-on-primary', title: 'Stay on schedule', description: 'Never miss an important payment' },
]

const modeTabs: { value: AuthMode; label: string }[] = [
  { value: 'signIn', label: 'Sign in' },
  { value: 'signUp', label: 'Sign up' },
]

function ModeTab({ tab, selected, onSelect }: { tab: (typeof modeTabs)[number]; selected: boolean; onSelect: (mode: AuthMode) => void }) {
  function onTabClick() {
    onSelect(tab.value)
  }

  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onTabClick}
      className={`h-12 rounded-lg text-base font-medium transition-colors ${selected ? 'bg-primary text-on-primary' : 'text-ink hover:bg-surface-muted'}`}
    >
      {tab.label}
    </button>
  )
}

export function LoginPage() {
  const { session, loading, error: sessionError, signIn, signUp } = useAuth()
  const [mode, setMode] = useState<AuthMode>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (loading) return <p role="status" className="p-8 text-muted">Restoring your session…</p>
  if (session) return <Navigate to="/" replace />

  function onModeChange(nextMode: AuthMode) {
    if (busy) return
    setMode(nextMode)
    setError(null)
  }

  async function onSubmitCredentials() {
    if (busy) return
    setError(null)
    if (!email.trim() || !password) {
      setError('Enter your email address and password.')
      return
    }
    setBusy(true)
    try {
      await (mode === 'signIn' ? signIn({ email, password }) : signUp({ email, password }))
      // The Firebase observer sets the session; Navigate above handles success.
    } catch (failure) {
      setError(authErrorMessage(failure))
    } finally { setBusy(false) }
  }

  return (
    <div className="flex min-h-screen min-w-[1280px]">
      <aside className="relative flex w-[40%] flex-col overflow-hidden bg-sidebar px-14 pt-8 text-on-sidebar">
        <Logo size="lg" />
        <h1 className="mt-14 text-[42px] leading-[1.15] font-bold tracking-tight">
          Take control
          <br />
          of your finances.
        </h1>
        <p className="mt-4 max-w-sm text-lg leading-relaxed text-on-sidebar-muted">
          Track expenses, set goals, and stay on top of important payments — all in one place.
        </p>
        <ul className="relative z-10 mt-7 space-y-5">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <li key={feature.title} className="flex items-center gap-5">
                <span className={`grid size-14 place-items-center rounded-full ${feature.iconClass}`}>
                  <Icon className="size-6" strokeWidth={2.25} />
                </span>
                <div>
                  <p className="text-[17px] font-semibold">{feature.title}</p>
                  <p className="text-sm text-on-sidebar-muted">{feature.description}</p>
                </div>
              </li>
            )
          })}
        </ul>
        <div className="-mx-14 mt-auto pt-4">
          <LoginIllustration />
        </div>
      </aside>

      <main className="flex flex-1 items-start justify-center bg-canvas pt-20">
        <div className="w-full max-w-[540px] rounded-2xl bg-surface px-9 pt-12 pb-14 shadow-card">
          <h2 className="text-center text-[32px] font-bold tracking-tight text-ink">Welcome to QBudget</h2>
          <p className="mt-1 text-center text-lg text-muted">Sign in to your account or create a new one.</p>

          <div role="tablist" className="mt-8 grid grid-cols-2 rounded-lg border border-line">
            {modeTabs.map((tab) => (
              <ModeTab key={tab.value} tab={tab} selected={mode === tab.value} onSelect={onModeChange} />
            ))}
          </div>

          <form onSubmit={(event) => { event.preventDefault(); void onSubmitCredentials() }}>
          <div className="mt-8 space-y-6">
            <TextField label="Email address" type="email" placeholder="Enter your email address" icon={Mail} value={email} onValueChange={setEmail} disabled={busy} required autoComplete="email" />
            <TextField
              label="Password"
              type="password"
              placeholder="Enter your password"
              icon={LockKeyhole}
              disabled={busy}
              required
              autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
              value={password}
              onValueChange={setPassword}
            />
          </div>

          {(error || sessionError) && <p role="alert" className="mt-4 text-sm text-danger">{error || sessionError}</p>}
          <Button type="submit" disabled={busy} fullWidth className="mt-9 h-14 text-base font-medium">
            {busy ? 'Please wait…' : mode === 'signIn' ? 'Sign in' : 'Sign up'}
          </Button>

          </form>


        </div>
      </main>
    </div>
  )
}
