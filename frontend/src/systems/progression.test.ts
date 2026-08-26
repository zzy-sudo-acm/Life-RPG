import { describe, expect, it } from 'vitest'
import type { AppData } from '../types/models'
import { completeTaskRewards } from './progression'

const CREATED_AT = '2026-01-01T00:00:00.000Z'
const COMPLETED_AT = '2026-08-24T10:00:00.000Z'

function makeAppData(goalProgress = 20, rewardProgress = 80): AppData {
  return {
    character: { id: 'character', createdAt: CREATED_AT, updatedAt: CREATED_AT, name: '测试玩家', profession: '探索者', level: 1, exp: 90, expToNextLevel: 100, totalExp: 90, lifeStage: '大学阶段', primaryGoalId: 'goal-1' },
    stats: { id: 'stats', values: { technical: 10, intelligence: 10, creativity: 10, execution: 10, health: 10 }, history: [], updatedAt: CREATED_AT },
    skillCategories: [{ id: 'category-1', createdAt: CREATED_AT, updatedAt: CREATED_AT, name: '计算机', description: '', order: 0 }],
    skills: [{ id: 'skill-1', createdAt: CREATED_AT, updatedAt: CREATED_AT, categoryId: 'category-1', parentId: null, name: 'TypeScript', level: 1, exp: 45, expToNextLevel: 50, description: '' }],
    goals: [{ id: 'goal-1', createdAt: CREATED_AT, updatedAt: CREATED_AT, parentId: null, name: '项目交付', type: 'major', displayMode: 'boss', description: '', deadline: null, status: 'active', progress: goalProgress }],
    tasks: [{ id: 'task-1', createdAt: CREATED_AT, updatedAt: CREATED_AT, goalId: 'goal-1', categoryId: 'category-1', name: '实现奖励引擎', description: '', dueDate: null, difficulty: 'hard', status: 'in_progress', rewards: { exp: 250, stats: { technical: 3, execution: 2 }, skills: [{ skillId: 'skill-1', amount: 120 }], goalProgress: rewardProgress }, completedAt: null, rewardApplied: false }],
    achievements: [],
    events: [],
  }
}

describe('completeTaskRewards', () => {
  it('原子结算角色、属性、技能与 Goal 进度，并支持连续升级', () => {
    const input = makeAppData()
    const before = structuredClone(input)
    const result = completeTaskRewards(input, 'task-1', COMPLETED_AT)

    expect(input).toEqual(before)
    expect(result.character).toMatchObject({ level: 3, exp: 120, expToNextLevel: 144, totalExp: 340 })
    expect(result.stats.values).toMatchObject({ technical: 13, execution: 12 })
    expect(result.stats.history[0]?.source).toBe('task')
    expect(result.skills[0]).toMatchObject({ level: 3, exp: 52, expToNextLevel: 79 })
    expect(result.goals[0]).toMatchObject({ progress: 100, status: 'completed' })
    expect(result.tasks[0]).toMatchObject({ status: 'completed', rewardApplied: true, completedAt: COMPLETED_AT })
    expect(result.events).toHaveLength(1)
    expect(result.events[0]).toMatchObject({ sourceType: 'goal', sourceId: 'goal-1', title: '击败目标：项目交付' })
  })

  it('普通任务完成不会写入成长足迹', () => {
    const result = completeTaskRewards(makeAppData(10, 10), 'task-1', COMPLETED_AT)
    expect(result.goals[0]?.progress).toBe(20)
    expect(result.events).toEqual([])
  })

  it('重复完成已结算任务不会重复发放奖励或节点', () => {
    const once = completeTaskRewards(makeAppData(), 'task-1', COMPLETED_AT)
    const twice = completeTaskRewards(once, 'task-1', '2026-08-25T10:00:00.000Z')
    expect(twice).toBe(once)
    expect(twice.character.totalExp).toBe(340)
    expect(twice.events).toHaveLength(1)
  })

  it('达到自动成就阈值时解锁并写入成长足迹', () => {
    const data = makeAppData(10, 10)
    data.achievements.push({ id: 'achievement-first', createdAt: CREATED_AT, updatedAt: CREATED_AT, name: '第一步', icon: '🏆', description: '完成第一个任务', unlockType: 'automatic', unlockedAt: null, trigger: { event: 'task.completed', threshold: 1 } })
    const result = completeTaskRewards(data, 'task-1', COMPLETED_AT)
    expect(result.achievements[0]?.unlockedAt).toBe(COMPLETED_AT)
    expect(result.events).toHaveLength(1)
    expect(result.events[0]).toMatchObject({ sourceType: 'achievement', title: '获得成就：第一步' })
  })
})
