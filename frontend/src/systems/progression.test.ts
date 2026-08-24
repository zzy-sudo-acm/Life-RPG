import { describe, expect, it } from 'vitest'
import type { AppData } from '../types/models'
import {
  completeTaskRewards,
  damageBossProgress,
} from './progression'

const CREATED_AT = '2026-01-01T00:00:00.000Z'
const COMPLETED_AT = '2026-08-24T10:00:00.000Z'

function makeAppData(): AppData {
  return {
    character: {
      id: 'character',
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT,
      name: '测试玩家',
      profession: '算法探索者',
      level: 1,
      exp: 90,
      expToNextLevel: 100,
      totalExp: 90,
      lifeStage: '大学阶段',
      primaryGoalId: 'goal-1',
    },
    stats: {
      id: 'stats',
      values: {
        technical: 10,
        intelligence: 10,
        creativity: 10,
        execution: 10,
        health: 10,
      },
      history: [],
      updatedAt: CREATED_AT,
    },
    skillCategories: [
      {
        id: 'category-1',
        createdAt: CREATED_AT,
        updatedAt: CREATED_AT,
        name: '计算机',
        description: '',
        order: 0,
      },
    ],
    skills: [
      {
        id: 'skill-1',
        createdAt: CREATED_AT,
        updatedAt: CREATED_AT,
        categoryId: 'category-1',
        parentId: null,
        name: 'TypeScript',
        level: 1,
        exp: 45,
        expToNextLevel: 50,
        description: '',
      },
    ],
    goals: [
      {
        id: 'goal-1',
        createdAt: CREATED_AT,
        updatedAt: CREATED_AT,
        parentId: null,
        name: '完成项目',
        type: 'major',
        description: '',
        deadline: null,
        status: 'active',
        progress: 20,
      },
    ],
    tasks: [
      {
        id: 'task-1',
        createdAt: CREATED_AT,
        updatedAt: CREATED_AT,
        goalId: 'goal-1',
        name: '实现奖励引擎',
        type: '开发',
        description: '',
        dueDate: null,
        status: 'in_progress',
        rewards: {
          exp: 250,
          stats: { technical: 3, execution: 2 },
          skills: [{ skillId: 'skill-1', amount: 120 }],
          bosses: [{ bossId: 'boss-1', damage: 999 }],
        },
        completedAt: null,
        rewardApplied: false,
      },
    ],
    achievements: [],
    equipment: [],
    events: [],
    bosses: [
      {
        id: 'boss-1',
        createdAt: CREATED_AT,
        updatedAt: CREATED_AT,
        goalId: 'goal-1',
        name: '项目交付',
        description: '',
        maxHp: 100,
        currentHp: 30,
        deadline: null,
        status: 'active',
      },
    ],
    timeline: [],
  }
}

describe('completeTaskRewards', () => {
  it('原子结算角色、属性、技能和 Boss 奖励，并支持连续升级', () => {
    const input = makeAppData()
    const before = structuredClone(input)
    const result = completeTaskRewards(input, 'task-1', COMPLETED_AT)

    expect(input).toEqual(before)
    expect(result).not.toBe(input)
    expect(result.character).toMatchObject({
      level: 3,
      exp: 120,
      expToNextLevel: 144,
      totalExp: 340,
      updatedAt: COMPLETED_AT,
    })
    expect(result.stats.values).toMatchObject({ technical: 13, execution: 12 })
    expect(result.stats.history).toHaveLength(1)
    expect(result.stats.history[0]).toMatchObject({
      source: 'task',
      recordedAt: COMPLETED_AT,
      values: { technical: 13, execution: 12 },
    })
    expect(result.skills[0]).toMatchObject({
      level: 3,
      exp: 52,
      expToNextLevel: 79,
    })
    expect(result.bosses[0]).toMatchObject({
      currentHp: 0,
      status: 'defeated',
    })
    expect(result.tasks[0]).toMatchObject({
      status: 'completed',
      completedAt: COMPLETED_AT,
      rewardApplied: true,
    })
    expect(result.events).toHaveLength(1)
    expect(result.events[0]).toMatchObject({
      sourceType: 'task',
      sourceId: 'task-1',
      rewards: input.tasks[0]?.rewards,
    })
  })

  it('重复完成已结算任务不会重复发放任何奖励或事件', () => {
    const once = completeTaskRewards(makeAppData(), 'task-1', COMPLETED_AT)
    const twice = completeTaskRewards(
      once,
      'task-1',
      '2026-08-25T10:00:00.000Z',
    )

    expect(twice).toBe(once)
    expect(twice.character.totalExp).toBe(340)
    expect(twice.stats.history).toHaveLength(1)
    expect(twice.events).toHaveLength(1)
  })
})

describe('damageBossProgress', () => {
  it('将 HP 限制为 0、标记 defeated，并自动记录实际伤害事件', () => {
    const input = makeAppData()
    const result = damageBossProgress(
      input,
      'boss-1',
      100,
      '完成冲刺',
      COMPLETED_AT,
    )

    expect(input.bosses[0]?.currentHp).toBe(30)
    expect(result.bosses[0]).toMatchObject({
      currentHp: 0,
      status: 'defeated',
      updatedAt: COMPLETED_AT,
    })
    expect(result.events[0]).toMatchObject({
      title: '击败 Boss：项目交付',
      description: '完成冲刺（造成 30 点伤害）',
      sourceType: 'boss',
      sourceId: 'boss-1',
      rewards: { bosses: [{ bossId: 'boss-1', damage: 30 }] },
    })
  })

  it('拒绝零值、负值和非有限伤害', () => {
    const data = makeAppData()

    expect(() => damageBossProgress(data, 'boss-1', 0)).toThrow()
    expect(() => damageBossProgress(data, 'boss-1', -1)).toThrow()
    expect(() => damageBossProgress(data, 'boss-1', Number.NaN)).toThrow()
  })
})
