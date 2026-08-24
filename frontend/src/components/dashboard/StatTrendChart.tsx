import type { StatKey, StatSnapshot } from '../../types/models'
import { STAT_KEYS, STAT_LABELS } from '../../types/models'
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

  if (points.length === 0) {
    return <p className="py-16 text-center text-sm text-muted">还没有属性趋势记录</p>
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted">
        {STAT_KEYS.map((key: StatKey) => (
          <span key={key} className="inline-flex items-center gap-1.5">
            <span
              className="size-2 rounded-full shadow-[0_0_6px_currentColor]"
              style={{ backgroundColor: STAT_COLORS[key], color: STAT_COLORS[key] }}
            />
            {STAT_LABELS[key]}
          </span>
        ))}
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
                  stroke="#232b3d"
                  strokeWidth="1"
                />
                <text x={PADDING.left - 10} y={y + 4} textAnchor="end" fontSize="11" fill="#68718a">
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
              fill="#68718a"
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
            return (
              <g key={key}>
                {points.length > 1 ? (
                  <polyline
                    points={linePoints}
                    fill="none"
                    stroke={STAT_COLORS[key]}
                    strokeWidth="2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    style={{ filter: `drop-shadow(0 0 5px ${STAT_COLORS[key]}55)` }}
                  />
                ) : null}
                {coordinates.map(({ x, y, value }, index) => (
                  <circle
                    key={`${key}-${points[index]?.id}`}
                    cx={x}
                    cy={y}
                    r="3"
                    fill={STAT_COLORS[key]}
                    stroke="#090d16"
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
