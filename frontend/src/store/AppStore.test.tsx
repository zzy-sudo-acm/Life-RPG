import { act, renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { SCHEMA_VERSION } from '../data/constants'
import { loadAppData, resetDatabase } from '../data/database'
import { loadSettings } from '../data/settings'
import { validateSaveFile } from '../systems/saveValidation'
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

  it('串行结算任务并将结果持久化，重复完成不重复发奖', async () => {
    const { result } = renderHook(() => useAppStore(), { wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    const initial = result.current.data
    expect(initial).not.toBeNull()

    const task = initial?.tasks.find((item) => !item.rewardApplied)
    expect(task).toBeDefined()
    if (!initial || !task) {
      return
    }

    const totalExpBefore = initial.character.totalExp
    const eventCountBefore = initial.events.length

    await act(async () => result.current.completeTask(task.id))
    expect(result.current.data?.character.totalExp).toBe(
      totalExpBefore + task.rewards.exp,
    )
    expect(result.current.data?.events).toHaveLength(eventCountBefore + 1)

    await act(async () => result.current.completeTask(task.id))
    expect(result.current.data?.character.totalExp).toBe(
      totalExpBefore + task.rewards.exp,
    )
    expect(result.current.data?.events).toHaveLength(eventCountBefore + 1)

    const persisted = await loadAppData()
    expect(persisted.tasks.find((item) => item.id === task.id)?.rewardApplied).toBe(
      true,
    )
  })

  it('完成任务后忽略旧快照对结算状态的回退', async () => {
    const { result } = renderHook(() => useAppStore(), { wrapper })
    await waitFor(() => expect(result.current.data).not.toBeNull())

    const initial = result.current.data
    const task = initial?.tasks.find((item) => !item.rewardApplied)
    expect(initial).not.toBeNull()
    expect(task).toBeDefined()
    if (!initial || !task) return

    const totalExpBefore = initial.character.totalExp
    const eventCountBefore = initial.events.length

    await act(async () => {
      await Promise.all([
        result.current.completeTask(task.id),
        result.current.saveEntity('tasks', {
          ...task,
          status: 'in_progress',
          rewards: { ...task.rewards, exp: task.rewards.exp + 999 },
          rewardApplied: false,
          completedAt: null,
        }),
      ])
    })

    const savedTask = result.current.data?.tasks.find(
      (item) => item.id === task.id,
    )
    expect(savedTask).toMatchObject({
      status: 'completed',
      rewardApplied: true,
    })
    expect(savedTask?.completedAt).not.toBeNull()
    expect(savedTask?.rewards).toEqual(task.rewards)

    await act(async () => result.current.completeTask(task.id))
    expect(result.current.data?.character.totalExp).toBe(
      totalExpBefore + task.rewards.exp,
    )
    expect(result.current.data?.events).toHaveLength(eventCountBefore + 1)
  })

  it('导出会等待调用前已经排队的修改', async () => {
    const { result } = renderHook(() => useAppStore(), { wrapper })
    await waitFor(() => expect(result.current.data).not.toBeNull())

    const initial = result.current.data
    const task = initial?.tasks.find((item) => !item.rewardApplied)
    expect(initial).not.toBeNull()
    expect(task).toBeDefined()
    if (!initial || !task) return

    let exported!: Awaited<ReturnType<typeof result.current.createSaveFile>>
    await act(async () => {
      const completion = result.current.completeTask(task.id)
      const exportRequest = result.current.createSaveFile()
      ;[, exported] = await Promise.all([completion, exportRequest])
    })

    expect(exported.tasks.find((item) => item.id === task.id)?.rewardApplied).toBe(
      true,
    )
    expect(exported.character.totalExp).toBe(
      initial.character.totalExp + task.rewards.exp,
    )
  })

  it('移动技能分类时清理跨分类父子关系', async () => {
    const { result } = renderHook(() => useAppStore(), { wrapper })
    await waitFor(() => expect(result.current.data).not.toBeNull())

    const parent = result.current.data?.skills[0]
    const targetCategory = result.current.data?.skillCategories.find(
      (category) => category.id !== parent?.categoryId,
    )
    expect(parent).toBeDefined()
    expect(targetCategory).toBeDefined()
    if (!parent || !targetCategory) return

    await act(async () =>
      result.current.saveEntity('skills', {
        ...parent,
        id: 'skill-child-for-category-test',
        parentId: parent.id,
        name: '分类关系测试子技能',
      }),
    )
    await act(async () =>
      result.current.saveEntity('skills', {
        ...parent,
        categoryId: targetCategory.id,
      }),
    )

    expect(
      result.current.data?.skills.find(
        (skill) => skill.id === 'skill-child-for-category-test',
      )?.parentId,
    ).toBeNull()
    expect(validateSaveFile(await result.current.createSaveFile())).toBe(true)
  })

  it('多个 Store 依次写入时以 IndexedDB 最新数据为基础合并', async () => {
    const first = renderHook(() => useAppStore(), { wrapper })
    const second = renderHook(() => useAppStore(), { wrapper })
    await waitFor(() => expect(first.result.current.data).not.toBeNull())
    await waitFor(() => expect(second.result.current.data).not.toBeNull())

    const template = first.result.current.data?.goals[0]
    expect(template).toBeDefined()
    if (!template) return

    await act(async () =>
      first.result.current.saveEntity('goals', {
        ...template,
        id: 'goal-from-first-store',
        name: '第一个标签页目标',
      }),
    )
    await act(async () =>
      second.result.current.saveEntity('goals', {
        ...template,
        id: 'goal-from-second-store',
        name: '第二个标签页目标',
      }),
    )

    const persisted = await loadAppData()
    expect(persisted.goals.map((goal) => goal.id)).toEqual(
      expect.arrayContaining([
        'goal-from-first-store',
        'goal-from-second-store',
      ]),
    )
  })

  it('暴露可调用的自动成就评估接口', async () => {
    const { result } = renderHook(() => useAppStore(), { wrapper })
    await waitFor(() => expect(result.current.data).not.toBeNull())

    const timestamp = '2026-08-24T12:00:00.000Z'
    await act(async () =>
      result.current.saveEntity('achievements', {
        id: 'achievement-store-auto',
        name: '完成 30 个任务',
        icon: '🏆',
        description: '',
        unlockType: 'automatic',
        unlockedAt: null,
        trigger: { event: 'task.completed', threshold: 30 },
        createdAt: timestamp,
        updatedAt: timestamp,
      }),
    )

    await act(async () =>
      result.current.evaluateAchievements({
        event: 'task.completed',
        value: 30,
        occurredAt: timestamp,
      }),
    )

    expect(
      result.current.data?.achievements.find(
        (achievement) => achievement.id === 'achievement-store-auto',
      )?.unlockedAt,
    ).toBe(timestamp)
  })

  it('导入时整体替换存档，并保留导出 schemaVersion', async () => {
    const { result } = renderHook(() => useAppStore(), { wrapper })
    await waitFor(() => expect(result.current.data).not.toBeNull())

    const saveFile = await result.current.createSaveFile()
    const importedName = '导入后的角色'

    await act(async () =>
      result.current.importSaveFile({
        ...saveFile,
        character: { ...saveFile.character, name: importedName },
      }),
    )

    expect(result.current.data?.character.name).toBe(importedName)
    expect((await result.current.createSaveFile()).schemaVersion).toBe(SCHEMA_VERSION)
    expect((await loadAppData()).character.name).toBe(importedName)
  })

  it('仅使用 localStorage 保存界面配置', async () => {
    const { result } = renderHook(() => useAppStore(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    act(() => result.current.updateSettings({ sidebarCollapsed: true }))

    expect(loadSettings().sidebarCollapsed).toBe(true)
  })

  it('删除实体时清理关联引用，导出的存档仍可通过严格校验', async () => {
    const { result } = renderHook(() => useAppStore(), { wrapper })
    await waitFor(() => expect(result.current.data).not.toBeNull())

    const goal = result.current.data?.goals[0]
    expect(goal).toBeDefined()
    if (!goal) {
      return
    }

    await act(async () =>
      result.current.saveEntity('goals', {
        ...goal,
        id: 'goal-child',
        parentId: goal.id,
        name: '子目标',
        type: 'minor',
      }),
    )
    await act(async () => result.current.deleteEntity('goals', goal.id))
    expect(result.current.data?.character.primaryGoalId).toBeNull()
    expect(
      result.current.data?.goals.find((item) => item.id === 'goal-child')
        ?.parentId,
    ).toBeNull()
    expect(result.current.data?.tasks.some((task) => task.goalId === goal.id)).toBe(
      false,
    )
    expect(result.current.data?.bosses.some((boss) => boss.goalId === goal.id)).toBe(
      false,
    )
    expect(validateSaveFile(await result.current.createSaveFile())).toBe(true)

    await act(async () => result.current.resetToDefaults())
    const skill = result.current.data?.skills[0]
    expect(skill).toBeDefined()
    if (!skill) {
      return
    }

    await act(async () =>
      result.current.saveEntity('skills', {
        ...skill,
        id: 'skill-child',
        parentId: skill.id,
        name: '子技能',
      }),
    )
    await act(async () => result.current.deleteEntity('skills', skill.id))
    expect(
      result.current.data?.skills.find((item) => item.id === 'skill-child')
        ?.parentId,
    ).toBeNull()
    expect(
      result.current.data?.tasks.flatMap((task) => task.rewards.skills),
    ).not.toContainEqual(expect.objectContaining({ skillId: skill.id }))
    expect(validateSaveFile(await result.current.createSaveFile())).toBe(true)

    await act(async () => result.current.resetToDefaults())
    const categoryId = result.current.data?.skills[0]?.categoryId
    expect(categoryId).toBeDefined()
    if (!categoryId) {
      return
    }

    await act(async () =>
      result.current.deleteEntity('skillCategories', categoryId),
    )
    expect(
      result.current.data?.skills.some((item) => item.categoryId === categoryId),
    ).toBe(false)
    expect(result.current.data?.tasks.flatMap((task) => task.rewards.skills)).toEqual(
      [],
    )
    expect(validateSaveFile(await result.current.createSaveFile())).toBe(true)

    await act(async () => result.current.resetToDefaults())
    const bossId = result.current.data?.bosses[0]?.id
    expect(bossId).toBeDefined()
    if (!bossId) {
      return
    }

    await act(async () => result.current.deleteEntity('bosses', bossId))
    expect(result.current.data?.tasks.flatMap((task) => task.rewards.bosses)).toEqual(
      [],
    )
    expect(validateSaveFile(await result.current.createSaveFile())).toBe(true)

    await act(async () => result.current.resetToDefaults())
    const firstTimelineId = result.current.data?.timeline[0]?.id
    expect(firstTimelineId).toBeDefined()
    if (!firstTimelineId) {
      return
    }

    await act(async () =>
      result.current.deleteEntity('timeline', firstTimelineId),
    )
    expect(result.current.data?.timeline[0]?.parentId).toBeNull()
    expect(validateSaveFile(await result.current.createSaveFile())).toBe(true)
  })
})
