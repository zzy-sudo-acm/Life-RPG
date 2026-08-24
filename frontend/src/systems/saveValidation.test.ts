import { describe, expect, it } from 'vitest'
import type { SaveFile } from '../types/models'
import {
  parseSaveFile,
  SaveValidationError,
  validateSaveFile,
} from './saveValidation'

const NOW = '2026-08-24T10:00:00.000Z'

function makeSaveFile(): SaveFile {
  return {
    schemaVersion: 1,
    app: 'life-rpg',
    exportedAt: NOW,
    character: {
      id: 'character',
      createdAt: NOW,
      updatedAt: NOW,
      name: '玩家',
      profession: '探索者',
      level: 1,
      exp: 0,
      expToNextLevel: 100,
      totalExp: 0,
      lifeStage: '起点',
      primaryGoalId: null,
    },
    stats: {
      id: 'stats',
      values: {
        technical: 0,
        intelligence: 0,
        creativity: 0,
        execution: 0,
        health: 0,
      },
      history: [],
      updatedAt: NOW,
    },
    skillCategories: [],
    skills: [],
    goals: [],
    tasks: [],
    achievements: [],
    equipment: [],
    events: [],
    bosses: [],
    timeline: [],
  }
}

describe('parseSaveFile', () => {
  it('接受完整合法对象或 JSON，并返回独立副本', () => {
    const source = makeSaveFile()
    const parsedObject = parseSaveFile(source)
    const parsedJson = parseSaveFile(JSON.stringify(source))

    expect(parsedObject).toEqual(source)
    expect(parsedObject).not.toBe(source)
    expect(parsedObject.character).not.toBe(source.character)
    expect(parsedJson).toEqual(source)
    expect(validateSaveFile(source)).toBe(true)
  })

  it.each([
    ['错误 app', { app: 'another-app' }],
    ['错误 schemaVersion', { schemaVersion: 2 }],
  ])('拒绝%s', (_label, patch) => {
    expect(() => parseSaveFile({ ...makeSaveFile(), ...patch })).toThrow(
      SaveValidationError,
    )
  })

  it('拒绝顶层和嵌套的额外字段', () => {
    const topLevel = { ...makeSaveFile(), dangerous: true }
    const nested = makeSaveFile() as SaveFile & {
      character: SaveFile['character'] & { unexpected: string }
    }
    nested.character.unexpected = 'nope'

    expect(() => parseSaveFile(topLevel)).toThrow(/dangerous/)
    expect(() => parseSaveFile(nested)).toThrow(/unexpected/)
  })

  it('拒绝缺字段、非法数值、非法日期和畸形集合', () => {
    const missing = makeSaveFile() as Partial<SaveFile>
    delete missing.stats

    const invalidNumber = makeSaveFile()
    invalidNumber.character.level = 0

    const invalidDate = makeSaveFile()
    invalidDate.exportedAt = '2026-02-30'

    const malformed = { ...makeSaveFile(), skills: {} }

    expect(() => parseSaveFile(missing)).toThrow(/stats/)
    expect(() => parseSaveFile(invalidNumber)).toThrow(/level/)
    expect(() => parseSaveFile(invalidDate)).toThrow(/exportedAt/)
    expect(() => parseSaveFile(malformed)).toThrow(/skills/)
    expect(validateSaveFile(malformed)).toBe(false)
  })

  it('拒绝悬空引用和互相矛盾的关键状态', () => {
    const danglingGoal = makeSaveFile()
    danglingGoal.character.primaryGoalId = 'missing-goal'

    const invalidBoss = makeSaveFile()
    invalidBoss.bosses.push({
      id: 'boss-1',
      createdAt: NOW,
      updatedAt: NOW,
      goalId: null,
      name: '测试 Boss',
      description: '',
      maxHp: 100,
      currentHp: 0,
      deadline: null,
      status: 'active',
    })

    expect(() => parseSaveFile(danglingGoal)).toThrow(/primaryGoalId/)
    expect(() => parseSaveFile(invalidBoss)).toThrow(/currentHp/)
  })

  it('拒绝跨分类的技能父子关系', () => {
    const saveFile = makeSaveFile()
    saveFile.skillCategories.push(
      {
        id: 'category-1',
        name: '分类一',
        description: '',
        order: 0,
        createdAt: NOW,
        updatedAt: NOW,
      },
      {
        id: 'category-2',
        name: '分类二',
        description: '',
        order: 1,
        createdAt: NOW,
        updatedAt: NOW,
      },
    )
    saveFile.skills.push(
      {
        id: 'parent-skill',
        categoryId: 'category-1',
        parentId: null,
        name: '父技能',
        level: 1,
        exp: 0,
        expToNextLevel: 100,
        description: '',
        createdAt: NOW,
        updatedAt: NOW,
      },
      {
        id: 'child-skill',
        categoryId: 'category-2',
        parentId: 'parent-skill',
        name: '子技能',
        level: 1,
        exp: 0,
        expToNextLevel: 100,
        description: '',
        createdAt: NOW,
        updatedAt: NOW,
      },
    )

    expect(() => parseSaveFile(saveFile)).toThrow(/同一分类/)
  })

  it('拒绝已完成但未结算的任务以及不存在的日期时间', () => {
    const invalidTask = makeSaveFile()
    invalidTask.tasks.push({
      id: 'task-1',
      goalId: null,
      name: '坏状态任务',
      type: '测试',
      description: '',
      dueDate: null,
      status: 'completed',
      rewards: { exp: 0, stats: {}, skills: [], bosses: [] },
      completedAt: NOW,
      rewardApplied: false,
      createdAt: NOW,
      updatedAt: NOW,
    })

    const invalidDateTime = makeSaveFile()
    invalidDateTime.character.updatedAt = '2026-02-30T10:00:00.000Z'

    expect(() => parseSaveFile(invalidTask)).toThrow(/rewardApplied/)
    expect(() => parseSaveFile(invalidDateTime)).toThrow(/有效日期/)
  })

  it('拒绝层级结构中的循环引用', () => {
    const saveFile = makeSaveFile()
    saveFile.goals.push(
      {
        id: 'goal-a',
        parentId: 'goal-b',
        name: '目标 A',
        type: 'major',
        description: '',
        deadline: null,
        status: 'active',
        progress: 0,
        createdAt: NOW,
        updatedAt: NOW,
      },
      {
        id: 'goal-b',
        parentId: 'goal-a',
        name: '目标 B',
        type: 'minor',
        description: '',
        deadline: null,
        status: 'planned',
        progress: 0,
        createdAt: NOW,
        updatedAt: NOW,
      },
    )

    expect(() => parseSaveFile(saveFile)).toThrow(/循环引用/)
  })

  it('接受等待触发的自动成就，拒绝没有日期的手动成就', () => {
    const automatic = makeSaveFile()
    automatic.achievements.push({
      id: 'achievement-auto',
      name: '自动成就',
      icon: '🏆',
      description: '',
      unlockType: 'automatic',
      unlockedAt: null,
      trigger: { event: 'task.completed', threshold: 30 },
      createdAt: NOW,
      updatedAt: NOW,
    })
    expect(parseSaveFile(automatic).achievements[0]?.unlockedAt).toBeNull()

    const manual = makeSaveFile()
    manual.achievements.push({
      ...automatic.achievements[0]!,
      id: 'achievement-manual',
      unlockType: 'manual',
      trigger: null,
    })
    expect(() => parseSaveFile(manual)).toThrow(/手动成就/)
  })

  it('拒绝无效 JSON 文本', () => {
    expect(() => parseSaveFile('{broken')).toThrow('输入不是有效 JSON')
  })
})
