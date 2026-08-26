import { act, renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { SCHEMA_VERSION } from '../data/constants'
import { loadAppData, resetDatabase } from '../data/database'
import { loadSettings } from '../data/settings'
import { validateSaveFile } from '../systems/saveValidation'
import { EMPTY_REWARDS, type Task } from '../types/models'
import { AppStoreProvider } from './AppStore'
import { useAppStore } from './AppStoreContext'

function wrapper({ children }: PropsWithChildren) {
  return <AppStoreProvider>{children}</AppStoreProvider>
}

describe('AppStoreProvider', () => {
  beforeEach(async () => {
    localStorage.clear()
    await resetDatabase()
  })

  it('保存任务时覆盖手填奖励并按规则自动计算', async () => {
    const { result } = renderHook(() => useAppStore(), { wrapper })
    await waitFor(() => expect(result.current.data).not.toBeNull())
    const data = result.current.data!
    const timestamp = '2026-08-26T08:00:00.000Z'
    const task: Task = {
      id: 'task-auto-reward', name: '数学强化', description: '',
      categoryId: 'category-mathematics', goalId: data.goals[0]?.id ?? null,
      difficulty: 'medium', dueDate: null, status: 'todo', rewards: { ...EMPTY_REWARDS, exp: 999 },
      completedAt: null, rewardApplied: false, createdAt: timestamp, updatedAt: timestamp,
    }
    await act(async () => result.current.saveEntity('tasks', task))
    expect(result.current.data?.tasks.find((item) => item.id === task.id)?.rewards).toEqual({
      exp: 30,
      stats: { intelligence: 0.5 },
      skills: [{ skillId: 'skill-math', amount: 6 }],
      goalProgress: 10,
    })
  })

  it('串行结算并持久化任务，重复完成不重复发奖或记录普通事件', async () => {
    const { result } = renderHook(() => useAppStore(), { wrapper })
    await waitFor(() => expect(result.current.data).not.toBeNull())
    const initial = result.current.data!
    const task = initial.tasks[0]!
    const eventCount = initial.events.length
    await act(async () => result.current.completeTask(task.id))
    expect(result.current.data?.character.totalExp).toBe(initial.character.totalExp + task.rewards.exp)
    expect(result.current.data?.events).toHaveLength(eventCount)
    await act(async () => result.current.completeTask(task.id))
    expect(result.current.data?.character.totalExp).toBe(initial.character.totalExp + task.rewards.exp)
    expect((await loadAppData()).tasks[0]?.rewardApplied).toBe(true)
  })

  it('完成任务后忽略旧快照对结算状态的回退', async () => {
    const { result } = renderHook(() => useAppStore(), { wrapper })
    await waitFor(() => expect(result.current.data).not.toBeNull())
    const task = result.current.data!.tasks[0]!
    await act(async () => {
      await Promise.all([
        result.current.completeTask(task.id),
        result.current.saveEntity('tasks', { ...task, status: 'in_progress', rewardApplied: false, completedAt: null }),
      ])
    })
    expect(result.current.data?.tasks[0]).toMatchObject({ status: 'completed', rewardApplied: true })
    expect(result.current.data?.tasks[0]?.rewards).toEqual(task.rewards)
  })

  it('导出等待调用前排队的写入', async () => {
    const { result } = renderHook(() => useAppStore(), { wrapper })
    await waitFor(() => expect(result.current.data).not.toBeNull())
    const task = result.current.data!.tasks[0]!
    let exported!: Awaited<ReturnType<typeof result.current.createSaveFile>>
    await act(async () => {
      const completion = result.current.completeTask(task.id)
      const exportRequest = result.current.createSaveFile()
      ;[, exported] = await Promise.all([completion, exportRequest])
    })
    expect(exported.tasks[0]?.rewardApplied).toBe(true)
    expect(exported.schemaVersion).toBe(SCHEMA_VERSION)
  })

  it('多个 Store 依次写入时从 IndexedDB 最新状态合并', async () => {
    const first = renderHook(() => useAppStore(), { wrapper })
    const second = renderHook(() => useAppStore(), { wrapper })
    await waitFor(() => expect(first.result.current.data).not.toBeNull())
    await waitFor(() => expect(second.result.current.data).not.toBeNull())
    const template = first.result.current.data!.goals[0]!
    await act(async () => first.result.current.saveEntity('goals', { ...template, id: 'goal-first', name: '目标一' }))
    await act(async () => second.result.current.saveEntity('goals', { ...template, id: 'goal-second', name: '目标二' }))
    expect((await loadAppData()).goals.map((goal) => goal.id)).toEqual(expect.arrayContaining(['goal-first', 'goal-second']))
  })

  it('自动成就解锁时同步写入成长足迹', async () => {
    const { result } = renderHook(() => useAppStore(), { wrapper })
    await waitFor(() => expect(result.current.data).not.toBeNull())
    const timestamp = '2026-08-26T12:00:00.000Z'
    await act(async () => result.current.evaluateAchievements({ event: 'task.completed', value: 7, occurredAt: timestamp }))
    expect(result.current.data?.achievements.find((item) => item.id === 'achievement-seven-tasks')?.unlockedAt).toBe(timestamp)
    expect(result.current.data?.events).toContainEqual(expect.objectContaining({ sourceType: 'achievement', sourceId: 'achievement-seven-tasks' }))
  })

  it('导入整体替换存档，localStorage 仅保存界面设置', async () => {
    const { result } = renderHook(() => useAppStore(), { wrapper })
    await waitFor(() => expect(result.current.data).not.toBeNull())
    const save = await result.current.createSaveFile()
    await act(async () => result.current.importSaveFile({ ...save, character: { ...save.character, name: '导入角色' } }))
    expect(result.current.data?.character.name).toBe('导入角色')
    act(() => result.current.updateSettings({ sidebarCollapsed: true }))
    expect(loadSettings().sidebarCollapsed).toBe(true)
  })

  it('删除目标和技能时清理引用，导出仍通过严格校验', async () => {
    const { result } = renderHook(() => useAppStore(), { wrapper })
    await waitFor(() => expect(result.current.data).not.toBeNull())
    const goal = result.current.data!.goals[0]!
    await act(async () => result.current.saveEntity('goals', { ...goal, id: 'goal-child', parentId: goal.id, name: '子目标', type: 'minor' }))
    await act(async () => result.current.deleteEntity('goals', goal.id))
    expect(result.current.data?.character.primaryGoalId).toBeNull()
    expect(result.current.data?.goals.find((item) => item.id === 'goal-child')?.parentId).toBeNull()
    expect(result.current.data?.tasks.some((task) => task.goalId === goal.id)).toBe(false)

    const skill = result.current.data!.skills[0]!
    await act(async () => result.current.deleteEntity('skills', skill.id))
    expect(result.current.data?.tasks.flatMap((task) => task.rewards.skills)).not.toContainEqual(expect.objectContaining({ skillId: skill.id }))
    expect(validateSaveFile(await result.current.createSaveFile())).toBe(true)
  })
})
