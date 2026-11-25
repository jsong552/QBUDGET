import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { useDisplayPreferences } from '../hooks/useDisplayPreferences'
import { dateFormatStorageKey, defaultDateFormat, setDateFormat } from '../lib/dateFormat'
import { formatDate } from '../lib/format'
import { themeStorageKey } from '../lib/theme'
import type { Session } from '../types'
import { AuthContext, type AuthContextValue } from './authContext'
import { DisplayPreferencesProvider } from './DisplayPreferencesProvider'

const settings = vi.hoisted(() => ({ getDisplayPreferences: vi.fn() }))
vi.mock('../services/settingsService', () => settings)

afterEach(() => {
  vi.unstubAllGlobals()
  setDateFormat(defaultDateFormat)
})

const signedIn: Session = {
  token: 'token-1',
  user: { id: 'user-1', email: 'alex@example.com', fullName: 'Alex Student', firstName: 'Alex', initials: 'AS', studentId: null },
}

function authValue(session: Session | null): AuthContextValue {
  return { session, loading: false, error: null, signIn: vi.fn(), signUp: vi.fn(), signOut: vi.fn(), updateUser: vi.fn() }
}

/** Stands in for a page: reads the shared preferences and shows a date the way every page does. */
function Probe() {
  const { data, theme } = useDisplayPreferences()
  return <output data-theme={theme} data-loaded={String(data !== undefined)} data-date={formatDate('2024-09-10')} />
}

interface Device {
  /** Theme remembered on this device. */
  stored?: string
  /** Date format remembered on this device. */
  storedDateFormat?: string
  osDark: boolean
}

/** Renders once (no effects run) and returns what the provider would show: theme, loaded state and a sample date. */
function render(session: Session | null, { stored, storedDateFormat, osDark }: Device) {
  const remembered: Record<string, string | undefined> = { [themeStorageKey]: stored, [dateFormatStorageKey]: storedDateFormat }
  vi.stubGlobal('localStorage', { getItem: (key: string) => remembered[key] ?? null, setItem: vi.fn() })
  vi.stubGlobal('window', { matchMedia: () => ({ matches: osDark, addEventListener: vi.fn(), removeEventListener: vi.fn() }) })
  const html = renderToStaticMarkup(
    <AuthContext.Provider value={authValue(session)}>
      <DisplayPreferencesProvider>
        <Probe />
      </DisplayPreferencesProvider>
    </AuthContext.Provider>,
  )
  return {
    theme: /data-theme="(\w+)"/.exec(html)?.[1],
    loaded: /data-loaded="(\w+)"/.exec(html)?.[1] === 'true',
    date: /data-date="([^"]+)"/.exec(html)?.[1],
  }
}

describe('DisplayPreferencesProvider', () => {
  it('signed out, shows the theme last used on this device', () => {
    expect(render(null, { stored: 'dark', osDark: false })).toMatchObject({ theme: 'dark', loaded: false })
    expect(render(null, { stored: 'light', osDark: true })).toMatchObject({ theme: 'light', loaded: false })
  })

  it('with no remembered theme, follows the operating system', () => {
    expect(render(null, { osDark: true }).theme).toBe('dark')
    expect(render(null, { osDark: false }).theme).toBe('light')
    expect(render(null, { stored: 'system', osDark: true }).theme).toBe('dark')
  })

  it('signed in but still loading, keeps the remembered theme and has no preferences yet', () => {
    expect(render(signedIn, { stored: 'dark', osDark: false })).toMatchObject({ theme: 'dark', loaded: false })
  })

  it('pages drawn in the same render use the date format remembered on this device', () => {
    expect(render(signedIn, { storedDateFormat: 'YYYY_MM_DD', osDark: false }).date).toBe('2024-09-10')
    expect(render(null, { storedDateFormat: 'DD_MM_YYYY', osDark: false }).date).toBe('10/09/2024')
  })

  it('pages use "Sep 10, 2024" when no date format is remembered or it is unrecognised', () => {
    expect(render(signedIn, { storedDateFormat: 'YYYY_MM_DD', osDark: false }).date).toBe('2024-09-10')
    expect(render(signedIn, { osDark: false }).date).toBe('Sep 10, 2024')
    expect(render(signedIn, { storedDateFormat: 'MM_DD_YYYY', osDark: false }).date).toBe('Sep 10, 2024')
  })

  it('explains the missing provider instead of failing later', () => {
    expect(() => renderToStaticMarkup(<Probe />)).toThrow('useDisplayPreferences must be used inside DisplayPreferencesProvider')
  })
})
