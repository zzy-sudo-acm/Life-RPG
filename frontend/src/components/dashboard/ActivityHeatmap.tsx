import type { LifeEvent } from '../../types/models'
import { cn } from '../../utils/cn'
import { formatNumber } from '../../utils/format'

const WEEKS = 12
const DAYS_PER_WEEK = 7

/** 足迹着色阶梯：纸面空墨 → 竹青渐深 */
const CELL_COLORS = ['#ede5d3', '#d8e5d8', '#a9c8b1', '#6fa587', '#3f6f52']

function dayKey(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

interface DayActivity {
  date: string
  count: number
  exp: number
  future: boolean
}

interface ActivityHeatmapProps {
  events: LifeEvent[]
}

/** 修炼足迹：近 12 周，每天一格，按当日获得的 EXP 着色的热力图。 */
export function ActivityHeatmap({ events }: ActivityHeatmapProps) {
  const today = new Date()
  const mondayOffset = (today.getDay() + 6) % 7 // 周一为一周起点
  const start = addDays(today, -mondayOffset - (WEEKS - 1) * DAYS_PER_WEEK)

  const perDay = new Map<string, { count: number; exp: number }>()
  for (const event of events) {
    const key = event.date.slice(0, 10)
    const entry = perDay.get(key) ?? { count: 0, exp: 0 }
    entry.count += 1
    entry.exp += event.rewards.exp
    perDay.set(key, entry)
  }

  const maxExp = Math.max(0, ...[...perDay.values()].map((entry) => entry.exp))

  const days: DayActivity[] = []
  for (let index = 0; index < WEEKS * DAYS_PER_WEEK; index += 1) {
    const date = addDays(start, index)
    const key = dayKey(date)
    const entry = perDay.get(key)
    days.push({
      date: key,
      count: entry?.count ?? 0,
      exp: entry?.exp ?? 0,
      future: key > dayKey(today),
    })
  }

  const levelOf = (day: DayActivity): number => {
    if (day.exp > 0 && maxExp > 0) {
      const ratio = day.exp / maxExp
      if (ratio < 0.25) return 1
      if (ratio < 0.5) return 2
      if (ratio < 0.75) return 3
      return 4
    }
    // 有记录但没有 EXP：也留一笔淡墨，那一天不算虚度
    return day.count > 0 ? 1 : 0
  }

  const activeDays = days.filter((day) => day.count > 0).length
  const totalExp = days.reduce((sum, day) => sum + day.exp, 0)

  // 月份标签：某列周一与上一列周一不同月时标注
  const monthLabels: Array<{ index: number; label: string }> = []
  for (let week = 0; week < WEEKS; week += 1) {
    const monday = addDays(start, week * DAYS_PER_WEEK)
    const previous = addDays(start, (week - 1) * DAYS_PER_WEEK)
    if (week === 0 || monday.getMonth() !== previous.getMonth()) {
      monthLabels.push({ index: week, label: `${monday.getMonth() + 1}月` })
    }
  }

  return (
    <div>
      {/* 月份刻度 */}
      <div
        aria-hidden
        className="mb-1.5 grid gap-[3px] text-[10px] text-faint"
        style={{ gridTemplateColumns: `repeat(${WEEKS}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: WEEKS }, (_, week) => (
          <span key={week}>
            {monthLabels.find((label) => label.index === week)?.label ?? ''}
          </span>
        ))}
      </div>

      <div
        className="grid grid-rows-7 gap-[3px]"
        style={{ gridAutoFlow: 'column', gridAutoColumns: 'minmax(0, 1fr)' }}
        role="img"
        aria-label={`近 ${WEEKS} 周修炼足迹：${activeDays} 天有记录，累计 EXP ${totalExp}`}
      >
        {days.map((day) => (
          <span
            key={day.date}
            title={
              day.future
                ? undefined
                : `${day.date} · ${day.count} 条记录 · EXP +${day.exp}`
            }
            className={cn('aspect-square w-full rounded-[3px]', day.future && 'opacity-0')}
            style={{ backgroundColor: CELL_COLORS[levelOf(day)] }}
          />
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-faint">
        <p className="font-kai">
          近 {WEEKS} 周留痕 {activeDays} 天 · 累计修为 +{formatNumber(totalExp)}
        </p>
        <p className="flex items-center gap-1" aria-hidden>
          少
          {CELL_COLORS.map((color) => (
            <span
              key={color}
              className="size-2.5 rounded-[2px]"
              style={{ backgroundColor: color }}
            />
          ))}
          多
        </p>
      </div>
    </div>
  )
}
