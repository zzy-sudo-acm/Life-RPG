import { describe, expect, it } from 'vitest'
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
})
