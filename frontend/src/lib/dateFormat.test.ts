import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  dateFormatStorageKey,
  defaultDateFormat,
  forgetStoredDateFormat,
  getDateFormat,
  isDateFormatPreference,
  readStoredDateFormat,
  setDateFormat,
  storeDateFormat,
} from './dateFormat'

afterEach(() => {
  vi.unstubAllGlobals()
  setDateFormat(defaultDateFormat)
})

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial))
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
    removeItem: (key: string) => {
      values.delete(key)
    },
  }
}

const blockedStorage = {
  getItem: (): string | null => {
    throw new Error('SecurityError: storage is disabled')
  },
  setItem: () => {
    throw new Error('SecurityError: storage is disabled')
  },
  removeItem: () => {
    throw new Error('SecurityError: storage is disabled')
  },
}

describe('date format setting', () => {
  it('starts as "Sep 10, 2024", like the backend default', () => {
    expect(defaultDateFormat).toBe('MMM_DD_YYYY')
    expect(getDateFormat()).toBe('MMM_DD_YYYY')
  })

  it('accepts exactly the formats the backend accepts', () => {
    for (const value of ['MMM_DD_YYYY', 'DD_MM_YYYY', 'YYYY_MM_DD']) expect(isDateFormatPreference(value)).toBe(true)
    for (const value of ['MM_DD_YYYY', 'yyyy_mm_dd', '', null, undefined, 3]) expect(isDateFormatPreference(value)).toBe(false)
  })

  it('can be changed', () => {
    setDateFormat('DD_MM_YYYY')
    expect(getDateFormat()).toBe('DD_MM_YYYY')
  })
})

describe('date format remembered on this device', () => {
  it('stores and reads back each format', () => {
    const storage = memoryStorage()
    vi.stubGlobal('localStorage', storage)
    for (const format of ['MMM_DD_YYYY', 'DD_MM_YYYY', 'YYYY_MM_DD'] as const) {
      storeDateFormat(format)
      expect(storage.values.get(dateFormatStorageKey)).toBe(format)
      expect(readStoredDateFormat()).toBe(format)
    }
  })

  it('ignores a missing or unrecognised stored value', () => {
    vi.stubGlobal('localStorage', memoryStorage())
    expect(readStoredDateFormat()).toBeNull()
    vi.stubGlobal('localStorage', memoryStorage({ [dateFormatStorageKey]: 'MM_DD_YYYY' }))
    expect(readStoredDateFormat()).toBeNull()
  })

  it('never throws when storage is blocked or missing', () => {
    vi.stubGlobal('localStorage', blockedStorage)
    expect(readStoredDateFormat()).toBeNull()
    expect(() => storeDateFormat('DD_MM_YYYY')).not.toThrow()
    vi.stubGlobal('localStorage', undefined)
    expect(readStoredDateFormat()).toBeNull()
    expect(() => storeDateFormat('DD_MM_YYYY')).not.toThrow()
  })

  it('can forget the date format (after the account is deleted)', () => {
    const storage = memoryStorage({ [dateFormatStorageKey]: 'YYYY_MM_DD', other: 'kept' })
    vi.stubGlobal('localStorage', storage)
    forgetStoredDateFormat()
    expect(readStoredDateFormat()).toBeNull()
    expect(storage.values.get('other')).toBe('kept')
    vi.stubGlobal('localStorage', blockedStorage)
    expect(() => forgetStoredDateFormat()).not.toThrow()
  })
})
