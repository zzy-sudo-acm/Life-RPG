import { describe, expect, it } from 'vitest'
import type { Goal } from '../types/models'
import {
  deleteEntity,
  loadAppData,
  replaceAppData,
  resetDatabase,
  saveCharacter,
  saveEntity,
  saveStats,
} from './database'

describe('IndexedDB data layer', () => {
  it('seeds a complete default save on first use', async () => {
    const data = await loadAppData()

    expect(data.character.id).toBe('character')
    expect(data.character.level).toBe(1)
    expect(data.stats.id).toBe('stats')
    expect(data.stats.history[0]?.source).toBe('seed')
    expect(data.skillCategories.map((category) => category.name)).toEqual([
      '计算机',
      '数学',
      '语言',
      '科研',
      '运动',
    ])
    expect(data.timeline.map((node) => node.title)).toEqual([
      '大学阶段',
      '积累阶段',
      '职业阶段',
    ])
    expect(data.timeline[1]?.parentId).toBe(data.timeline[0]?.id)
    expect(data.timeline[2]?.parentId).toBe(data.timeline[1]?.id)
    expect(data.character.primaryGoalId).toBe(data.goals[0]?.id)
    expect(data.tasks[0]?.goalId).toBe(data.goals[0]?.id)
    expect(data.tasks[0]?.rewards.skills[0]?.skillId).toBe(data.skills[0]?.id)
    expect(data.tasks[0]?.rewards.bosses[0]?.bossId).toBe(data.bosses[0]?.id)
  })

  it('persists singleton records', async () => {
    await resetDatabase()
    const data = await loadAppData()
    const updatedCharacter = {
      ...data.character,
      name: '测试冒险者',
      level: 2,
    }
    const updatedStats = {
      ...data.stats,
      values: { ...data.stats.values, technical: 12 },
    }

    await saveCharacter(updatedCharacter)
    await saveStats(updatedStats)

    const reloaded = await loadAppData()
    expect(reloaded.character.name).toBe('测试冒险者')
    expect(reloaded.character.level).toBe(2)
    expect(reloaded.stats.values.technical).toBe(12)
  })

  it('creates, updates, and deletes collection entities', async () => {
    await resetDatabase()
    const now = '2026-08-24T12:00:00.000Z'
    const goal: Goal = {
      id: 'goal-test',
      parentId: null,
      name: '完成数据层',
      type: 'major',
      description: '验证 IndexedDB 实体读写',
      deadline: null,
      status: 'active',
      progress: 10,
      createdAt: now,
      updatedAt: now,
    }

    await saveEntity('goals', goal)
    expect((await loadAppData()).goals).toContainEqual(goal)

    const updatedGoal: Goal = { ...goal, progress: 80 }
    await saveEntity('goals', updatedGoal)
    expect(
      (await loadAppData()).goals.find((entity) => entity.id === goal.id),
    ).toEqual(updatedGoal)

    await deleteEntity('goals', goal.id)
    expect(
      (await loadAppData()).goals.some((entity) => entity.id === goal.id),
    ).toBe(false)
  })

  it('atomically replaces all application data and can reset it', async () => {
    await resetDatabase()
    const data = await loadAppData()
    const replacement = {
      ...data,
      character: { ...data.character, name: '导入角色' },
      skillCategories: [],
      timeline: [],
    }

    await replaceAppData(replacement)

    const imported = await loadAppData()
    expect(imported.character.name).toBe('导入角色')
    expect(imported.skillCategories).toEqual([])
    expect(imported.timeline).toEqual([])

    const defaults = await resetDatabase()
    expect(defaults.character.name).toBe('冒险者')
    expect((await loadAppData()).skillCategories).toHaveLength(5)
  })
})
