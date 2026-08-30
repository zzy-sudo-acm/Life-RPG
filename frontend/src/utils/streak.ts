import { localDateString } from './format'

/** 把本地日期字符串（YYYY-MM-DD）平移 offset 天，避免 UTC 转换带来的时区漂移。 */
function shiftLocalDate(dateString: string, offsetDays: number): string {
  const [year = 1970, month = 1, day = 1] = dateString.split('-').map(Number)
  const date = new Date(year, month - 1, day + offsetDays)
  return localDateString(date)
}

/**
 * 连续完成天数：从今天（或昨天，今天还有机会补）往前数，
 * 每天至少完成一件任务才算不断档。
 */
export function calcCompletionStreak(
  completedDates: Array<string | null>,
  today: string = localDateString(),
): number {
  const days = new Set(
    completedDates
      .filter((value): value is string => value !== null)
      .map((value) => value.slice(0, 10)),
  )
  let cursor = days.has(today) ? today : shiftLocalDate(today, -1)
  let streak = 0
  while (days.has(cursor)) {
    streak += 1
    cursor = shiftLocalDate(cursor, -1)
  }
  return streak
}
