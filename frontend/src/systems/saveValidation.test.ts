import { describe, expect, it } from 'vitest'
import { SCHEMA_VERSION } from '../data/constants'
import defaultDataJson from '../data/defaultData.json'
import type { AppData, SaveFile } from '../types/models'
import { parseSaveFile, SaveValidationError, validateSaveFile } from './saveValidation'

const NOW = '2026-08-24T10:00:00.000Z'

function makeSaveFile(): SaveFile {
  return {
    ...(structuredClone(defaultDataJson) as AppData),
    schemaVersion: SCHEMA_VERSION,
    app: 'life-rpg',
    exportedAt: NOW,
  }
}

function makeLegacySave(): Record<string, unknown> {
  const current = makeSaveFile()
  const legacyGoal = { ...current.goals[0] }
  delete (legacyGoal as Partial<typeof legacyGoal>).displayMode
  return {
    schemaVersion: 1,
    app: 'life-rpg',
    exportedAt: NOW,
    character: current.character,
    stats: current.stats,
    skillCategories: current.skillCategories,
    skills: current.skills,
    goals: [legacyGoal],
    tasks: [{
      id: 'legacy-task', goalId: legacyGoal.id, name: '旧版任务', type: '数学',
      description: '', dueDate: null, status: 'todo',
      rewards: { exp: 25, stats: { intelligence: 1 }, skills: [], bosses: [{ bossId: 'legacy-boss', damage: 20 }] },
      completedAt: null, rewardApplied: false, createdAt: NOW, updatedAt: NOW,
    }],
    achievements: current.achievements.slice(0, 1),
    equipment: [{ id: 'equipment-old', name: '旧装备' }],
    events: [{ id: 'legacy-task-event', title: '完成任务：旧版任务', description: '', date: NOW, sourceType: 'task', sourceId: 'legacy-task', rewards: { exp: 25, stats: {}, skills: [], bosses: [] }, createdAt: NOW, updatedAt: NOW }],
    bosses: [{ id: 'legacy-boss', goalId: legacyGoal.id, name: '旧 Boss', description: '', maxHp: 100, currentHp: 60, deadline: null, status: 'active', createdAt: NOW, updatedAt: NOW }],
    timeline: [{ id: 'legacy-stage', parentId: null, title: '备考阶段', description: '开始备考', stageType: 'education', status: 'current', startDate: NOW, endDate: null, order: 1, createdAt: NOW, updatedAt: NOW }],
  }
}

describe('parseSaveFile', () => {
  it('接受 v2 对象或 JSON，并返回独立副本', () => {
    const source = makeSaveFile()
    const parsed = parseSaveFile(source)
    expect(parsed).toEqual(source)
    expect(parsed).not.toBe(source)
    expect(parseSaveFile(JSON.stringify(source))).toEqual(source)
    expect(validateSaveFile(source)).toBe(true)
  })

  it('将 v1 Boss、地图与任务奖励迁移到 Goal 和成长足迹', () => {
    const parsed = parseSaveFile(makeLegacySave())
    expect(parsed.schemaVersion).toBe(2)
    expect(parsed.goals[0]).toMatchObject({ displayMode: 'boss', progress: 40 })
    expect(parsed.tasks[0]).toMatchObject({ categoryId: 'category-mathematics', difficulty: 'medium' })
    expect(parsed.tasks[0]?.rewards.goalProgress).toBe(20)
    expect(parsed.events.some((event) => (event.sourceType as string) === 'task')).toBe(false)
    expect(parsed.events).toContainEqual(expect.objectContaining({ sourceType: 'stage', title: '进入备考阶段' }))
    expect('equipment' in parsed).toBe(false)
    expect('bosses' in parsed).toBe(false)
    expect('timeline' in parsed).toBe(false)
  })

  it('拒绝错误 app、未知版本和额外字段', () => {
    expect(() => parseSaveFile({ ...makeSaveFile(), app: 'another-app' })).toThrow(SaveValidationError)
    expect(() => parseSaveFile({ ...makeSaveFile(), schemaVersion: 99 })).toThrow(SaveValidationError)
    expect(() => parseSaveFile({ ...makeSaveFile(), dangerous: true })).toThrow(/dangerous/)
  })

  it('拒绝缺字段、非法数值、非法日期和畸形集合', () => {
    const missing = makeSaveFile() as Partial<SaveFile>
    delete missing.stats
    const invalidLevel = makeSaveFile()
    invalidLevel.character.level = 0
    const invalidDate = makeSaveFile()
    invalidDate.exportedAt = '2026-02-30'
    expect(() => parseSaveFile(missing)).toThrow(/stats/)
    expect(() => parseSaveFile(invalidLevel)).toThrow(/level/)
    expect(() => parseSaveFile(invalidDate)).toThrow(/exportedAt/)
    expect(() => parseSaveFile({ ...makeSaveFile(), skills: {} })).toThrow(/skills/)
  })

  it('拒绝悬空引用和矛盾的任务状态', () => {
    const dangling = makeSaveFile()
    dangling.character.primaryGoalId = 'missing-goal'
    expect(() => parseSaveFile(dangling)).toThrow(/primaryGoalId/)

    const invalidTask = makeSaveFile()
    invalidTask.tasks[0] = { ...invalidTask.tasks[0]!, status: 'completed', completedAt: NOW, rewardApplied: false }
    expect(() => parseSaveFile(invalidTask)).toThrow(/rewardApplied/)
  })

  it('接受等待触发的自动成就，拒绝无日期的手动成就', () => {
    const automatic = makeSaveFile()
    automatic.achievements.push({ id: 'auto', name: '自动', icon: '🏆', description: '', unlockType: 'automatic', unlockedAt: null, trigger: { event: 'task.completed', threshold: 2 }, createdAt: NOW, updatedAt: NOW })
    expect(parseSaveFile(automatic).achievements.find((item) => item.id === 'auto')?.unlockedAt).toBeNull()
    automatic.achievements.push({ id: 'manual', name: '手动', icon: '🏆', description: '', unlockType: 'manual', unlockedAt: null, trigger: null, createdAt: NOW, updatedAt: NOW })
    expect(() => parseSaveFile(automatic)).toThrow(/手动成就/)
  })

  it('拒绝无效 JSON', () => {
    expect(() => parseSaveFile('{broken')).toThrow('输入不是有效 JSON')
  })
})
