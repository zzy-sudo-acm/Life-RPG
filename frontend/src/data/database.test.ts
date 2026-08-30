import { describe, expect, it } from 'vitest'
import type { Goal } from '../types/models'
import { deleteEntity, loadAppData, replaceAppData, resetDatabase, saveCharacter, saveEntity, saveStats } from './database'

describe('IndexedDB data layer v2', () => {
  it('初始化精简后的完整默认存档', async () => {
    const data = await resetDatabase()
    expect(data.character.id).toBe('character')
    expect(data.stats.history[0]?.source).toBe('seed')
    expect(data.skillCategories.map((category) => category.name)).toEqual(['计算机', '数学', '语言', '运动'])
    expect(data.character.primaryGoalId).toBe(data.goals[0]?.id)
    expect(data.goals[0]?.displayMode).toBe('boss')
    expect(data.tasks[0]?.categoryId).toBe('category-language')
    expect(data.tasks[0]?.rewards.goalProgress).toBe(10)
    expect('equipment' in data).toBe(false)
    expect('bosses' in data).toBe(false)
    expect('timeline' in data).toBe(false)
  })

  it('持久化角色和属性单例', async () => {
    const data = await resetDatabase()
    await saveCharacter({ ...data.character, name: '测试冒险者', level: 2 })
    await saveStats({ ...data.stats, values: { ...data.stats.values, technical: 12 } })
    const reloaded = await loadAppData()
    expect(reloaded.character.name).toBe('测试冒险者')
    expect(reloaded.character.level).toBe(2)
    expect(reloaded.stats.values.technical).toBe(12)
  })

  it('创建、更新和删除集合实体', async () => {
    await resetDatabase()
    const now = '2026-08-24T12:00:00.000Z'
    const goal: Goal = {
      id: 'goal-test', parentId: null, name: '完成数据层', type: 'major',
      displayMode: 'standard', description: '', deadline: null, status: 'active',
      progress: 10, createdAt: now, updatedAt: now,
    }
    await saveEntity('goals', goal)
    expect((await loadAppData()).goals).toContainEqual(goal)
    await saveEntity('goals', { ...goal, progress: 80 })
    expect((await loadAppData()).goals.find((item) => item.id === goal.id)?.progress).toBe(80)
    await deleteEntity('goals', goal.id)
    expect((await loadAppData()).goals.some((item) => item.id === goal.id)).toBe(false)
  })

  it('整体替换数据并恢复默认值', async () => {
    const data = await resetDatabase()
    await replaceAppData({ ...data, character: { ...data.character, name: '导入角色' }, skillCategories: [], skills: [] })
    const imported = await loadAppData()
    expect(imported.character.name).toBe('导入角色')
    expect(imported.skillCategories).toEqual([])
    expect(imported.skills).toEqual([])
    expect((await resetDatabase()).character.name).toBe('冒险者')
  })
})
