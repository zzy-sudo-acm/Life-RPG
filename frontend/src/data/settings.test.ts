import { beforeEach, describe, expect, it, vi } from 'vitest'
import { APP_NAME } from './constants'
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from './settings'

const values = new Map<string, string>()

const memoryStorage: Storage = {
  get length() {
    return values.size
  },
  clear() {
    values.clear()
  },
  getItem(key) {
    return values.get(key) ?? null
  },
  key(index) {
    return [...values.keys()][index] ?? null
  },
  removeItem(key) {
    values.delete(key)
  },
  setItem(key, value) {
    values.set(key, value)
  },
}

Object.defineProperty(window, 'localStorage', {
  configurable: true,
  value: memoryStorage,
})

describe('local settings', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('returns defaults when no saved settings exist', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  })

  it('persists settings in localStorage', () => {
    const settings = {
      sidebarCollapsed: true,
      taskFilter: 'in_progress' as const,
    }

    saveSettings(settings)

    expect(loadSettings()).toEqual(settings)
  })

  it('does not block core operations when localStorage rejects a write', () => {
    const failure = vi
      .spyOn(memoryStorage, 'setItem')
      .mockImplementationOnce(() => {
        throw new DOMException('Storage disabled', 'QuotaExceededError')
      })

    expect(() => saveSettings(DEFAULT_SETTINGS)).not.toThrow()
    failure.mockRestore()
  })

  it('falls back safely for malformed or invalid fields', () => {
    window.localStorage.setItem(`${APP_NAME}:settings`, '{invalid json')
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)

    window.localStorage.setItem(
      `${APP_NAME}:settings`,
      JSON.stringify({ sidebarCollapsed: true, taskFilter: 'unknown' }),
    )
    expect(loadSettings()).toEqual({
      sidebarCollapsed: true,
      taskFilter: 'all',
    })
  })
})
