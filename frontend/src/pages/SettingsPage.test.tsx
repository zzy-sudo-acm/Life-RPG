import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import defaults from '../data/defaultData.json'
import { SettingsPage } from './SettingsPage'

const { resetToDefaults } = vi.hoisted(() => ({
  resetToDefaults: vi.fn(async () => {}),
}))
vi.mock('../store/AppStoreContext', () => ({
  useAppStore: () => ({ data: defaults, error: null, resetToDefaults }),
}))
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  resetToDefaults.mockClear()
})

describe('重置存档确认', () => {
  it('取消确认时保留当前存档', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: '重置全部数据' }))
    expect(resetToDefaults).not.toHaveBeenCalled()
    expect(screen.queryByText('已恢复初始数据')).not.toBeInTheDocument()
  })
  it('仅在明确确认后调用重置并展示结果', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: '重置全部数据' }))
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('已恢复初始数据'),
    )
    expect(resetToDefaults).toHaveBeenCalledTimes(1)
  })
})
