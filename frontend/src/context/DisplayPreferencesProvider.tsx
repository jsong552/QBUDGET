import { useCallback, useEffect, useMemo, useState, type ReactNode, type SetStateAction } from 'react'
import { useAuth } from '../hooks/useAuth'
import { defaultDateFormat, readStoredDateFormat, setDateFormat, storeDateFormat } from '../lib/dateFormat'
import { applyTheme, defaultThemePreference, readStoredTheme, resolveTheme, storeTheme, systemPrefersDark, watchSystemTheme } from '../lib/theme'
import { getDisplayPreferences } from '../services/settingsService'
import type { DisplayPreferences } from '../types'
import { DisplayPreferencesContext, type DisplayPreferencesContextValue } from './displayPreferencesContext'

/** Preferences loaded for one account. `uid` stops one account's preferences from ever being shown to another. */
interface AccountPreferences {
  uid: string
  data: DisplayPreferences | undefined
  error: unknown
}

/**
 * Loads the signed-in user's display preferences once and shares them with every page (see useDisplayPreferences),
 * shows their theme on the whole document, and sets the date format that formatDate uses everywhere. While signed
 * out or loading, the theme and date format last used on this device are used instead; index.html applies that same
 * theme before the app starts.
 */
export function DisplayPreferencesProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const uid = session?.user.id ?? null
  const [loaded, setLoaded] = useState<AccountPreferences | null>(null)
  const [version, setVersion] = useState(0)
  const [systemDark, setSystemDark] = useState(systemPrefersDark)

  useEffect(() => {
    if (!uid) return
    let active = true
    getDisplayPreferences().then(
      (data) => {
        if (active) setLoaded({ uid, data, error: null })
      },
      (failure: unknown) => {
        if (!active) return
        console.error('[data] load failed', failure)
        // Like useAsync: keep this account's earlier preferences after a failed reload.
        setLoaded((previous) => ({ uid, data: previous?.uid === uid ? previous.data : undefined, error: failure }))
      },
    )
    return () => {
      active = false
    }
  }, [uid, version])

  useEffect(() => watchSystemTheme(setSystemDark), [])

  const current = uid !== null && loaded?.uid === uid ? loaded : null
  const data = current?.data
  const error = current?.error ?? null

  const setData = useCallback(
    (value: SetStateAction<DisplayPreferences | undefined>) => {
      if (!uid) return
      setLoaded((previous) => {
        const own = previous?.uid === uid ? previous : { uid, data: undefined, error: null }
        return { ...own, data: typeof value === 'function' ? value(own.data) : value }
      })
    },
    [uid],
  )

  const reload = useCallback(() => setVersion((count) => count + 1), [])

  const savedTheme = data?.theme
  const theme = resolveTheme(savedTheme ?? readStoredTheme() ?? defaultThemePreference, systemDark)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    if (savedTheme) storeTheme(savedTheme)
  }, [savedTheme])

  // Set while rendering, not in an effect, so pages drawn in this same render already use the new format.
  const savedDateFormat = data?.dateFormat
  setDateFormat(savedDateFormat ?? readStoredDateFormat() ?? defaultDateFormat)

  useEffect(() => {
    if (savedDateFormat) storeDateFormat(savedDateFormat)
  }, [savedDateFormat])

  const value = useMemo<DisplayPreferencesContextValue>(() => ({ data, error, reload, setData, theme }), [data, error, reload, setData, theme])
  return <DisplayPreferencesContext.Provider value={value}>{children}</DisplayPreferencesContext.Provider>
}
