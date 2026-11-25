import { createContext } from 'react'
import type { AsyncResource } from '../hooks/useAsync'
import type { ResolvedTheme } from '../lib/theme'
import type { DisplayPreferences } from '../types'

/**
 * The signed-in user's display preferences, shared by every page. `data` is undefined while signed out or loading;
 * `setData` shows a change everywhere at once (e.g. a new theme before it has been saved).
 */
export interface DisplayPreferencesContextValue extends AsyncResource<DisplayPreferences> {
  /** Theme on screen now, with "system" resolved from the operating system. */
  theme: ResolvedTheme
}

export const DisplayPreferencesContext = createContext<DisplayPreferencesContextValue | null>(null)
