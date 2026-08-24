import { useState } from 'react'
import type { StatKey, StatSnapshot } from '../../types/models'
import { STAT_KEYS, STAT_LABELS } from '../../types/models'
import { cn } from '../../utils/cn'
import { clamp } from '../../utils/format'
import { STAT_COLORS } from './statPalette'

const WIDTH = 680
const HEIGHT = 260
const PADDING = { top: 20, right: 18, bottom: 42, left: 42 }

function xFor(index: number, count: number): number {
  if (count <= 1) return PADDING.left
  return PADDING.left + (index / (count - 1)) * (WIDTH - PADDING.left - PADDING.right)
}

function yFor(value: number, maximum: number): number {
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom
  return PADDING.top + (1 - clamp(value, 0, maximum) / maximum) * plotHeight
}

function monthLabel(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value.slice(0, 7)
  return `${date.getMonth() + 1}月`
}

interface StatTrendChartProps {
  history: StatSnapshot[]
}

export function StatTrendChart({ history }: StatTrendChartProps) {
  const [selected, setSelected] = useState<StatKey | null>(null)

  const points = history
    .toSorted((a, b) => a.recordedAt.localeCompare(b.recordedAt))
    .slice(-8)
  const greatestValue = Math.max(
    100,
    ...points.flatMap((point) => STAT_KEYS.map((key) => point.values[key])),
  )
  const chartMaximum = Math.ceil(greatestValue / 25) * 25
  const axisValues = Array.from(
    { length: 5 },
    (_, index) => (chartMaximum / 4) * index,
  )

  if (points.length <= 1) {
    const snapshot = points[0]
    if (!snapshot) {
      return <p className="py-16 text-center text-sm text-muted">还没有属性趋势记录</p>
    }
    // 只有一笔记录时画不出曲线：改为一排属性墨点，封存首笔起点
    return (
      <div className="py-8">
        <div className="flex flex-wrap items-end justify-center gap-x-7 gap-y-4">
          {STAT_KEYS.map((key) => (
            <div key={key} className="flex flex-col items-center gap-1.5">
              <span
                className="font-display text-xl font-bold tabular-nums"
                style={{ color: STAT_COLORS[key] }}
              >
                {snapshot.values[key]}
              </span>
              <span className="size-2 rotate-45" style={{ backgroundColor: STAT_COLORS[key] }} />
              <span className="text-xs text-muted">{STAT_LABELS[key]}</span>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center font-kai text-xs text-faint">
          首笔属性已封存入册 · 再记录一次，成长曲线便会显现
        </p>
      </div>
    )
  }

  const baseline = yFor(0, chartMaximum)

  return (
    <div>
      {/* 图例即开关：点击单独高亮一条属性线 */}
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="属性图例筛选">
        {STAT_KEYS.map((key: StatKey) => {
          const active = selected === key
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => setSelected((current) => (current === key ? null : key))}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-all',
                active
                  ? 'border-transparent text-[#fbf7ee]'
                  : 'border-line bg-surface text-muted hover:text-ink',
                selected !== null && !active && 'opacity-45',
              )}
              style={active ? { backgroundColor: STAT_COLORS[key] } : undefined}
            >
              <span
                className="size-2 rotate-45"
                style={{ backgroundColor: active ? '#fbf7ee' : STAT_COLORS[key] }}
              />
              {STAT_LABELS[key]}
            </button>
          )
        })}
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="min-w-[440px]"
          role="img"
          aria-label="五维属性随时间变化折线图"
        >
          {axisValues.map((value) => {
            const y = yFor(value, chartMaximum)
            return (
              <g key={value}>
                <line
                  x1={PADDING.left}
                  x2={WIDTH - PADDING.right}
                  y1={y}
                  y2={y}
                  stroke="#ddd2ba"
                  strokeWidth="1"
                  strokeDasharray="3 4"
                />
                <text x={PADDING.left - 10} y={y + 4} textAnchor="end" fontSize="11" fill="#9a8d7a">
                  {value}
                </text>
              </g>
            )
          })}

          {points.map((point, index) => (
            <text
              key={point.id}
              x={xFor(index, points.length)}
              y={HEIGHT - 14}
              textAnchor={index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'}
              fontSize="11"
              fill="#9a8d7a"
            >
              {monthLabel(point.recordedAt)}
            </text>
          ))}

          {STAT_KEYS.map((key) => {
            const coordinates = points.map((point, index) => ({
              x: xFor(index, points.length),
              y: yFor(point.values[key], chartMaximum),
              value: point.values[key],
            }))
            const linePoints = coordinates.map(({ x, y }) => `${x},${y}`).join(' ')
            const areaPoints = `${linePoints} ${coordinates[coordinates.length - 1]?.x ?? PADDING.left},${baseline} ${coordinates[0]?.x ?? PADDING.left},${baseline}`
            const dimmed = selected !== null && selected !== key
            const highlighted = selected === key
            return (
              <g
                key={key}
                className="transition-opacity duration-300"
                opacity={dimmed ? 0.14 : 1}
              >
                {highlighted && points.length > 1 ? (
                  <polygon points={areaPoints} fill={STAT_COLORS[key]} opacity="0.12" />
                ) : null}
                {points.length > 1 ? (
                  <polyline
                    points={linePoints}
                    fill="none"
                    stroke={STAT_COLORS[key]}
                    strokeWidth={highlighted ? 2.8 : 2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                ) : null}
                {coordinates.map(({ x, y, value }, index) => (
                  <circle
                    key={`${key}-${points[index]?.id}`}
                    cx={x}
                    cy={y}
                    r={highlighted ? 4 : 3}
                    fill={STAT_COLORS[key]}
                    stroke="#fbf7ee"
                    strokeWidth="1.5"
                  >
                    <title>{`${STAT_LABELS[key]}：${value}`}</title>
                  </circle>
                ))}
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
