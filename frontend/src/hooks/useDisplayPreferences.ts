import { useContext } from 'react'
import { DisplayPreferencesContext } from '../context/displayPreferencesContext'

/** The signed-in user's display preferences and the theme on screen (see DisplayPreferencesProvider). */
export function useDisplayPreferences() {
  const context = useContext(DisplayPreferencesContext)
  if (!context) throw new Error('useDisplayPreferences must be used inside DisplayPreferencesProvider')
  return context
}
