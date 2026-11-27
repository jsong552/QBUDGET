import { afterEach, describe, expect, it, vi } from 'vitest'
import indexHtml from '../../index.html?raw'
import {
  applyTheme,
  defaultThemePreference,
  forgetStoredTheme,
  isThemePreference,
  readStoredTheme,
  resolveTheme,
  storeTheme,
  systemPrefersDark,
  themeStorageKey,
  watchSystemTheme,
  type ResolvedTheme,
} from './theme'

afterEach(() => {
  vi.unstubAllGlobals()
})

/** The parts of <html> that applyTheme and the index.html script use. */
function fakeRoot() {
  const classes = new Set<string>()
  return {
    classes,
    classList: {
      toggle(name: string, force?: boolean) {
        const on = force ?? !classes.has(name)
        if (on) classes.add(name)
        else classes.delete(name)
        return on
      },
    },
    style: { colorScheme: '' },
  }
}

function asElement(root: ReturnType<typeof fakeRoot>) {
  return root as unknown as HTMLElement
}

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

type ChangeListener = (event: { matches: boolean }) => void

/** Stand-in for window.matchMedia('(prefers-color-scheme: dark)'), with an OS setting the test can change. */
function fakeSystem(dark: boolean) {
  const listeners = new Set<ChangeListener>()
  const media = {
    get matches() {
      return dark
    },
    addEventListener: (_type: 'change', listener: ChangeListener) => {
      listeners.add(listener)
    },
    removeEventListener: (_type: 'change', listener: ChangeListener) => {
      listeners.delete(listener)
    },
  }
  return {
    listeners,
    matchMedia: vi.fn<(query: string) => typeof media>(() => media),
    setDark(next: boolean) {
      dark = next
      for (const listener of listeners) listener({ matches: next })
    },
  }
}

describe('resolveTheme', () => {
  it.each([
    ['light', false, 'light'],
    ['light', true, 'light'],
    ['dark', false, 'dark'],
    ['dark', true, 'dark'],
    ['system', false, 'light'],
    ['system', true, 'dark'],
  ] as const)('%s with OS dark mode %s shows %s', (preference, osDark, expected) => {
    expect(resolveTheme(preference, osDark)).toBe(expected)
  })

  it('follows the operating system until an account picks a theme', () => {
    expect(defaultThemePreference).toBe('system')
  })
})

describe('isThemePreference', () => {
  it('accepts exactly the themes the backend accepts', () => {
    for (const value of ['light', 'dark', 'system']) expect(isThemePreference(value)).toBe(true)
    for (const value of ['Dark', 'purple', '', null, undefined, 1]) expect(isThemePreference(value)).toBe(false)
  })
})

describe('theme remembered on this device', () => {
  it('stores and reads back each theme', () => {
    const storage = memoryStorage()
    vi.stubGlobal('localStorage', storage)
    for (const theme of ['light', 'dark', 'system'] as const) {
      storeTheme(theme)
      expect(storage.values.get(themeStorageKey)).toBe(theme)
      expect(readStoredTheme()).toBe(theme)
    }
  })

  it('ignores a missing or unrecognised stored value', () => {
    vi.stubGlobal('localStorage', memoryStorage())
    expect(readStoredTheme()).toBeNull()
    vi.stubGlobal('localStorage', memoryStorage({ [themeStorageKey]: 'purple' }))
    expect(readStoredTheme()).toBeNull()
  })

  it('never throws when storage is blocked or missing', () => {
    vi.stubGlobal('localStorage', blockedStorage)
    expect(readStoredTheme()).toBeNull()
    expect(() => storeTheme('dark')).not.toThrow()
    vi.stubGlobal('localStorage', undefined)
    expect(readStoredTheme()).toBeNull()
    expect(() => storeTheme('dark')).not.toThrow()
  })

  it('can forget the theme (after the account is deleted)', () => {
    const storage = memoryStorage({ [themeStorageKey]: 'dark', other: 'kept' })
    vi.stubGlobal('localStorage', storage)
    forgetStoredTheme()
    expect(readStoredTheme()).toBeNull()
    expect(storage.values.get('other')).toBe('kept')
    vi.stubGlobal('localStorage', blockedStorage)
    expect(() => forgetStoredTheme()).not.toThrow()
  })
})

describe('applyTheme', () => {
  it('switches the dark class and color-scheme on the root element', () => {
    const root = fakeRoot()
    applyTheme('dark', asElement(root))
    expect([...root.classes]).toEqual(['dark'])
    expect(root.style.colorScheme).toBe('dark')
    applyTheme('light', asElement(root))
    expect(root.classes.size).toBe(0)
    expect(root.style.colorScheme).toBe('light')
  })
})

describe('operating system theme', () => {
  it('reads whether the OS is in dark mode', () => {
    const system = fakeSystem(true)
    vi.stubGlobal('window', { matchMedia: system.matchMedia })
    expect(systemPrefersDark()).toBe(true)
    system.setDark(false)
    expect(systemPrefersDark()).toBe(false)
    expect(system.matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)')
  })

  it('reports OS changes until unsubscribed', () => {
    const system = fakeSystem(false)
    vi.stubGlobal('window', { matchMedia: system.matchMedia })
    const changes: boolean[] = []
    const stop = watchSystemTheme((dark) => changes.push(dark))
    system.setDark(true)
    system.setDark(false)
    stop()
    system.setDark(true)
    expect(changes).toEqual([true, false])
    expect(system.listeners.size).toBe(0)
  })

  it('treats a missing matchMedia (or no browser at all) as light', () => {
    expect(systemPrefersDark()).toBe(false)
    expect(() => watchSystemTheme(() => undefined)()).not.toThrow()
    vi.stubGlobal('window', {})
    expect(systemPrefersDark()).toBe(false)
    expect(() => watchSystemTheme(() => undefined)()).not.toThrow()
  })
})

describe('index.html start-up script', () => {
  const script = /<script>([\s\S]*?)<\/script>/.exec(indexHtml)?.[1] ?? ''

  function runScript(storage: unknown, window: unknown) {
    const root = fakeRoot()
    const run = new Function('window', 'document', 'localStorage', script) as (window: unknown, document: unknown, storage: unknown) => void
    run(window, { documentElement: root }, storage)
    return root
  }

  it('runs in <head>, before the app module loads', () => {
    expect(script).toContain(`'${themeStorageKey}'`)
    expect(indexHtml.indexOf(script)).toBeLessThan(indexHtml.indexOf('</head>'))
    expect(indexHtml.indexOf(script)).toBeLessThan(indexHtml.indexOf('<script type="module"'))
  })

  it.each([
    [null, false, 'light'],
    [null, true, 'dark'],
    ['light', false, 'light'],
    ['light', true, 'light'],
    ['dark', false, 'dark'],
    ['dark', true, 'dark'],
    ['system', false, 'light'],
    ['system', true, 'dark'],
    ['purple', false, 'light'],
    ['purple', true, 'dark'],
    ['blocked', false, 'light'],
    ['blocked', true, 'dark'],
  ] as const)('stored theme %s with OS dark mode %s shows %s, exactly like theme.ts', (stored, osDark, expected: ResolvedTheme) => {
    const storage = stored === 'blocked' ? blockedStorage : memoryStorage(stored === null ? {} : { [themeStorageKey]: stored })
    const fromScript = runScript(storage, { matchMedia: fakeSystem(osDark).matchMedia })

    vi.stubGlobal('localStorage', storage)
    const fromApp = fakeRoot()
    applyTheme(resolveTheme(readStoredTheme() ?? defaultThemePreference, osDark), asElement(fromApp))

    expect(fromScript.style.colorScheme).toBe(expected)
    expect(fromScript.classes.has('dark')).toBe(expected === 'dark')
    expect([...fromScript.classes]).toEqual([...fromApp.classes])
    expect(fromScript.style.colorScheme).toBe(fromApp.style.colorScheme)
  })

  it('shows light without matchMedia unless dark was chosen', () => {
    expect(runScript(memoryStorage(), {}).style.colorScheme).toBe('light')
    expect(runScript(memoryStorage({ [themeStorageKey]: 'dark' }), {}).style.colorScheme).toBe('dark')
  })
})
