import type { LocalSettings } from '../types/models'
import { APP_NAME } from './constants'

const SETTINGS_STORAGE_KEY = `${APP_NAME}:settings`

export const DEFAULT_SETTINGS: LocalSettings = {
  sidebarCollapsed: false,
  taskFilter: 'all',
}

const TASK_FILTERS: ReadonlySet<LocalSettings['taskFilter']> = new Set([
  'all',
  'todo',
  'in_progress',
  'completed',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function createDefaultSettings(): LocalSettings {
  return { ...DEFAULT_SETTINGS }
}

function getLocalStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

export function loadSettings(): LocalSettings {
  const savedValue = getLocalStorage()?.getItem(SETTINGS_STORAGE_KEY) ?? null

  if (savedValue === null) {
    return createDefaultSettings()
  }

  try {
    const parsed: unknown = JSON.parse(savedValue)

    if (!isRecord(parsed)) {
      return createDefaultSettings()
    }

    const sidebarCollapsed =
      typeof parsed.sidebarCollapsed === 'boolean'
        ? parsed.sidebarCollapsed
        : DEFAULT_SETTINGS.sidebarCollapsed
    const taskFilter = TASK_FILTERS.has(
      parsed.taskFilter as LocalSettings['taskFilter'],
    )
      ? (parsed.taskFilter as LocalSettings['taskFilter'])
      : DEFAULT_SETTINGS.taskFilter

    return { sidebarCollapsed, taskFilter }
  } catch {
    return createDefaultSettings()
  }
}

export function saveSettings(settings: LocalSettings): void {
  try {
    getLocalStorage()?.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // 界面偏好属于非关键数据；存储受限时仍允许核心 IndexedDB 操作继续。
  }
}
