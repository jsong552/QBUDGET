import type { DateFormatPreference } from '../types'

/*
 * The date format shown across the app. DisplayPreferencesProvider sets it from the signed-in user's preferences, and
 * formatDate / formatDateRange (lib/format.ts) read it, so every page follows the setting without changes of its own.
 */

/** localStorage key for the date format last used on this device. */
export const dateFormatStorageKey = 'qbudget.dateFormat'

/** "Sep 10, 2024". Matches the backend default. */
export const defaultDateFormat: DateFormatPreference = 'MMM_DD_YYYY'

let currentDateFormat: DateFormatPreference = defaultDateFormat

export function isDateFormatPreference(value: unknown): value is DateFormatPreference {
  return value === 'MMM_DD_YYYY' || value === 'DD_MM_YYYY' || value === 'YYYY_MM_DD'
}

/** The date format in use now. */
export function getDateFormat(): DateFormatPreference {
  return currentDateFormat
}

/** Changes the date format used by formatDate and formatDateRange. */
export function setDateFormat(format: DateFormatPreference): void {
  currentDateFormat = format
}

/** The date format last used on this device, or null when none is stored (or storage is blocked). */
export function readStoredDateFormat(): DateFormatPreference | null {
  try {
    const value = localStorage.getItem(dateFormatStorageKey)
    return isDateFormatPreference(value) ? value : null
  } catch {
    return null
  }
}

/** Forgets the date format remembered on this device (e.g. after the account is deleted). */
export function forgetStoredDateFormat(): void {
  try {
    localStorage.removeItem(dateFormatStorageKey)
  } catch {
    /* Storage may be blocked; then nothing was remembered anyway. */
  }
}

/** Remembers the date format on this device, so the next page load shows it before the account's preferences load. */
export function storeDateFormat(format: DateFormatPreference): void {
  try {
    localStorage.setItem(dateFormatStorageKey, format)
  } catch {
    /* Storage may be blocked (e.g. some private browsing modes); the format still applies to this page. */
  }
}
