import type { Task } from '../../types/models'
import { localDateString } from '../../utils/format'

/** Date-only values already describe a local calendar day; timestamps need conversion. */
export function calendarDay(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value.slice(0, 10)
    : localDateString(date)
}

export function calendarDate(day: string): Date {
  const [year = 1970, month = 1, date = 1] = day.split('-').map(Number)
  return new Date(year, month - 1, date)
}

export function displayDay(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(calendarDate(calendarDay(value)))
}

export function completedTasksByDay(
  tasks: readonly Task[],
): Map<string, Task[]> {
  const byDay = new Map<string, Task[]>()
  for (const task of tasks) {
    if (task.status !== 'completed' || !task.completedAt) continue
    const day = calendarDay(task.completedAt)
    const entries = byDay.get(day) ?? []
    entries.push(task)
    byDay.set(day, entries)
  }
  return byDay
}
