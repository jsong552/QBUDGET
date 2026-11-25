import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { useDisplayPreferences } from '../hooks/useDisplayPreferences'
import { themeStorageKey } from '../lib/theme'
import type { Session } from '../types'
import { AuthContext, type AuthContextValue } from './authContext'
import { DisplayPreferencesProvider } from './DisplayPreferencesProvider'

const settings = vi.hoisted(() => ({ getDisplayPreferences: vi.fn() }))
vi.mock('../services/settingsService', () => settings)

afterEach(() => {
  vi.unstubAllGlobals()
})

const signedIn: Session = {
  token: 'token-1',
  user: { id: 'user-1', email: 'alex@example.com', fullName: 'Alex Student', firstName: 'Alex', initials: 'AS', studentId: null },
}

function authValue(session: Session | null): AuthContextValue {
  return { session, loading: false, error: null, signIn: vi.fn(), signUp: vi.fn(), signOut: vi.fn(), updateUser: vi.fn() }
}

function Probe() {
  const { data, theme } = useDisplayPreferences()
  return <output data-theme={theme} data-loaded={String(data !== undefined)} />
}

/** Renders once (no effects run) and returns the theme the provider would show and whether preferences are loaded. */
function render(session: Session | null, { stored, osDark }: { stored?: string; osDark: boolean }) {
  vi.stubGlobal('localStorage', { getItem: (key: string) => (key === themeStorageKey ? stored ?? null : null), setItem: vi.fn() })
  vi.stubGlobal('window', { matchMedia: () => ({ matches: osDark, addEventListener: vi.fn(), removeEventListener: vi.fn() }) })
  const html = renderToStaticMarkup(
    <AuthContext.Provider value={authValue(session)}>
      <DisplayPreferencesProvider>
        <Probe />
      </DisplayPreferencesProvider>
    </AuthContext.Provider>,
  )
  return { theme: /data-theme="(\w+)"/.exec(html)?.[1], loaded: /data-loaded="(\w+)"/.exec(html)?.[1] === 'true' }
}

describe('DisplayPreferencesProvider', () => {
  it('signed out, shows the theme last used on this device', () => {
    expect(render(null, { stored: 'dark', osDark: false })).toEqual({ theme: 'dark', loaded: false })
    expect(render(null, { stored: 'light', osDark: true })).toEqual({ theme: 'light', loaded: false })
  })

  it('with no remembered theme, follows the operating system', () => {
    expect(render(null, { osDark: true }).theme).toBe('dark')
    expect(render(null, { osDark: false }).theme).toBe('light')
    expect(render(null, { stored: 'system', osDark: true }).theme).toBe('dark')
  })

  it('signed in but still loading, keeps the remembered theme and has no preferences yet', () => {
    expect(render(signedIn, { stored: 'dark', osDark: false })).toEqual({ theme: 'dark', loaded: false })
  })

  it('explains the missing provider instead of failing later', () => {
    expect(() => renderToStaticMarkup(<Probe />)).toThrow('useDisplayPreferences must be used inside DisplayPreferencesProvider')
  })
})
