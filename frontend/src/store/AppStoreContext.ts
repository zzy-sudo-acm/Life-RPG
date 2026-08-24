import { createContext, useContext } from 'react'
import type { AppStoreValue } from '../types/store'

export const AppStoreContext = createContext<AppStoreValue | null>(null)

export function useAppStore(): AppStoreValue {
  const context = useContext(AppStoreContext)
  if (context === null) {
    throw new Error('useAppStore 必须在 AppStoreProvider 内使用')
  }

  return context
}
