export function formatDate(value: string | null): string {
  if (!value) return '未设置'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('zh-CN').format(value)
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function toNumber(value: FormDataEntryValue | null, fallback = 0): number {
  const parsed = Number(value)
  return Number.isFinite(parsed)
    ? clamp(parsed, -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)
    : fallback
}

export function localDateString(date = new Date()): string {
  const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return localTime.toISOString().slice(0, 10)
}

/** 距离某日期的天数（今天为 0，已过为负）；无日期或无法解析时返回 null。 */
export function daysUntil(value: string | null): number | null {
  if (!value) return null
  const [year, month, day] = value.slice(0, 10).split('-').map(Number)
  if (!year || !month || !day) return null
  const target = new Date(year, month - 1, day)
  if (Number.isNaN(target.getTime())) return null
  const [nowYear = 1970, nowMonth = 1, nowDay = 1] = localDateString()
    .split('-')
    .map(Number)
  const today = new Date(nowYear, nowMonth - 1, nowDay)
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}
