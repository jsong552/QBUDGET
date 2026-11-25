import type { ThemePreference } from '../types'

/*
 * Light/dark theme. The `dark` class on <html> switches the colour tokens in index.css to their dark values, and
 * `color-scheme` makes native controls (select menus, date pickers, scrollbars) match.
 *
 * index.html runs a copy of this logic before the app loads, so a dark page never flashes white. Keep the storage
 * key, the accepted values and the default in sync with that script (theme.test.ts checks that they agree).
 */

/** The theme actually shown. "system" resolves to one of these. */
export type ResolvedTheme = 'light' | 'dark'

/** localStorage key for the theme last used on this device. */
export const themeStorageKey = 'qbudget.theme'

/** Theme used until an account's preference is known. Matches the backend default for new accounts. */
export const defaultThemePreference: ThemePreference = 'system'

const darkSchemeQuery = '(prefers-color-scheme: dark)'

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system'
}

export function resolveTheme(preference: ThemePreference, systemPrefersDark: boolean): ResolvedTheme {
  if (preference === 'system') return systemPrefersDark ? 'dark' : 'light'
  return preference
}

/** The theme last used on this device, or null when none is stored (or storage is blocked). */
export function readStoredTheme(): ThemePreference | null {
  try {
    const value = localStorage.getItem(themeStorageKey)
    return isThemePreference(value) ? value : null
  } catch {
    return null
  }
}

/** Remembers the theme on this device, so the next page load shows it before the account's preferences load. */
export function storeTheme(preference: ThemePreference): void {
  try {
    localStorage.setItem(themeStorageKey, preference)
  } catch {
    /* Storage may be blocked (e.g. some private browsing modes); the theme still applies to this page. */
  }
}

/** Forgets the theme remembered on this device (e.g. after the account is deleted), so the OS setting applies again. */
export function forgetStoredTheme(): void {
  try {
    localStorage.removeItem(themeStorageKey)
  } catch {
    /* Storage may be blocked; then nothing was remembered anyway. */
  }
}

function darkSchemeMedia(): MediaQueryList | null {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(darkSchemeQuery) : null
}

/** Whether the operating system (or browser) is set to dark mode. */
export function systemPrefersDark(): boolean {
  return darkSchemeMedia()?.matches ?? false
}

/** Calls `onChange` whenever the operating system switches between light and dark. Returns an unsubscribe function. */
export function watchSystemTheme(onChange: (prefersDark: boolean) => void): () => void {
  const media = darkSchemeMedia()
  if (!media) return () => {}
  const listener = (event: MediaQueryListEvent) => onChange(event.matches)
  media.addEventListener('change', listener)
  return () => media.removeEventListener('change', listener)
}

/** Shows `theme` on the page. */
export function applyTheme(theme: ResolvedTheme, root: HTMLElement = document.documentElement): void {
  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = theme
}
