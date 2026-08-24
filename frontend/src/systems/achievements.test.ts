import { describe, expect, it } from 'vitest'
import type { Achievement } from '../types/models'
import { evaluateAchievementTriggers } from './achievements'

const NOW = '2026-08-24T12:00:00.000Z'

function lockedAchievement(): Achievement {
  return {
    id: 'achievement-auto',
    name: '坚持完成任务',
    icon: '🏆',
    description: '',
    unlockType: 'automatic',
    unlockedAt: null,
    trigger: { event: 'task.completed', threshold: 30 },
    createdAt: NOW,
    updatedAt: NOW,
  }
}

describe('evaluateAchievementTriggers', () => {
  it('达到阈值时解锁，之后重复信号保持幂等', () => {
    const before = evaluateAchievementTriggers([lockedAchievement()], {
      event: 'task.completed',
      value: 29,
      occurredAt: NOW,
    })
    expect(before.unlockedIds).toEqual([])
    expect(before.achievements[0]?.unlockedAt).toBeNull()

    const unlocked = evaluateAchievementTriggers(before.achievements, {
      event: 'task.completed',
      value: 30,
      occurredAt: NOW,
    })
    expect(unlocked.unlockedIds).toEqual(['achievement-auto'])
    expect(unlocked.achievements[0]?.unlockedAt).toBe(NOW)

    const repeated = evaluateAchievementTriggers(unlocked.achievements, {
      event: 'task.completed',
      value: 31,
      occurredAt: '2026-08-25T12:00:00.000Z',
    })
    expect(repeated.unlockedIds).toEqual([])
    expect(repeated.achievements[0]?.unlockedAt).toBe(NOW)
  })
})
