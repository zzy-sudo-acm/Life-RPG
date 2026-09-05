import { describe, expect, it, vi } from 'vitest'
import defaultDataJson from '../data/defaultData.json'
import { completeTaskRewards } from '../systems/progression'
import type { AppData } from '../types/models'
import { calcCompletionStreak } from './streak'

describe('calcCompletionStreak', () => {
  it('今天有完成记录时从今天往前连数', () => {
    const dates = ['2026-08-24T10:00:00.000Z', '2026-08-23T08:00:00.000Z', '2026-08-22T12:00:00.000Z']
    expect(calcCompletionStreak(dates, '2026-08-24')).toBe(3)
  })

  it('今天还没完成时从昨天开始算，今天还有机会', () => {
    const dates = ['2026-08-23T10:00:00.000Z', '2026-08-22T10:00:00.000Z']
    expect(calcCompletionStreak(dates, '2026-08-24')).toBe(2)
  })

  it('断档即止，不跳过空缺日', () => {
    const dates = ['2026-08-24T10:00:00.000Z', '2026-08-22T10:00:00.000Z']
    expect(calcCompletionStreak(dates, '2026-08-24')).toBe(1)
  })

  it('昨天和今天都没有记录时归零', () => {
    expect(calcCompletionStreak(['2026-08-20T10:00:00.000Z'], '2026-08-24')).toBe(0)
    expect(calcCompletionStreak([], '2026-08-24')).toBe(0)
  })

  it('同一天多条记录只算一天', () => {
    const dates = ['2026-08-24T01:00:00.000Z', '2026-08-24T02:00:00.000Z', '2026-08-23T10:00:00.000Z']
    expect(calcCompletionStreak(dates, '2026-08-24')).toBe(2)
  })

  it('北京时间凌晨的记录按本地日期计算，不与前一天合并', () => {
    const timezone = vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(-480)
    try {
      const dates = ['2026-08-23T16:30:00.000Z', '2026-08-23T05:00:00.000Z']
      expect(calcCompletionStreak(dates, '2026-08-24')).toBe(2)
    } finally {
      timezone.mockRestore()
    }
  })

  it('北京时间凌晨不会用 UTC 日期掩盖本地日期中的断档', () => {
    const timezone = vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(-480)
    try {
      const dates = ['2026-08-23T16:30:00.000Z', '2026-08-22T05:00:00.000Z']
      expect(calcCompletionStreak(dates, '2026-08-24')).toBe(1)
    } finally {
      timezone.mockRestore()
    }
  })

  it('日期字符串本身代表本地日期，不做额外时区转换', () => {
    expect(calcCompletionStreak(['2026-08-24', '2026-08-23', null], '2026-08-24')).toBe(2)
  })

  it('自动成就与界面使用相同的本地连续天数', () => {
    const timezone = vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(-480)
    try {
      const data = structuredClone(defaultDataJson) as AppData
      const template = data.tasks[0]!
      const occurredAt = '2026-08-23T16:30:00.000Z'
      data.tasks = [
        { ...template, id: 'completed-before-midnight', status: 'completed', rewardApplied: true, completedAt: '2026-08-23T05:00:00.000Z' },
        { ...template, id: 'complete-after-midnight' },
      ]
      data.achievements = [{
        id: 'local-streak', name: '连续两天', description: '', icon: '🌱',
        unlockType: 'automatic', unlockedAt: null,
        trigger: { event: 'streak.days', threshold: 2 },
        createdAt: occurredAt, updatedAt: occurredAt,
      }]

      const result = completeTaskRewards(data, 'complete-after-midnight', occurredAt)
      expect(result.achievements[0]?.unlockedAt).toBe(occurredAt)
      expect(calcCompletionStreak(result.tasks.map((task) => task.completedAt), '2026-08-24')).toBe(2)
      expect(result.events.some((event) => event.sourceId === 'local-streak')).toBe(true)
    } finally {
      timezone.mockRestore()
    }
  })
})
