import { describe, expect, it } from 'vitest'
import type { AppData } from '../types/models'
import { calculateTaskRewards, statForCategory } from './rewardRules'

const data = {
  skillCategories: [{ id: 'math', name: '数学', description: '', order: 0, createdAt: '', updatedAt: '' }],
  skills: [{ id: 'algebra', categoryId: 'math', parentId: null, name: '代数', level: 1, exp: 0, expToNextLevel: 100, description: '', createdAt: '', updatedAt: '' }],
} satisfies Pick<AppData, 'skillCategories' | 'skills'>

describe('calculateTaskRewards', () => {
  it('难度决定数值，分类决定属性和技能，关联目标提供 EXP 加成与进度', () => {
    expect(calculateTaskRewards({ categoryId: 'math', difficulty: 'medium', goalId: 'goal' }, data)).toEqual({
      exp: 30,
      stats: { intelligence: 0.5 },
      skills: [{ skillId: 'algebra', amount: 6 }],
      goalProgress: 10,
    })
  })

  it('未关联目标时不生成目标进度', () => {
    expect(calculateTaskRewards({ categoryId: null, difficulty: 'easy', goalId: null }, data)).toEqual({
      exp: 10,
      stats: { execution: 0.25 },
      skills: [],
      goalProgress: 0,
    })
  })

  it('分类关键词映射到五维属性', () => {
    expect(statForCategory('跑步训练')).toBe('health')
    expect(statForCategory('UI 设计')).toBe('creativity')
    expect(statForCategory('算法开发')).toBe('technical')
  })
})
