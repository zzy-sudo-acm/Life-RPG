import { STAT_KEYS, STAT_LABELS, type StatValues } from '../../types/models'
import { STAT_COLORS } from './statPalette'

const SIZE = 292
const CENTER = SIZE / 2
const RADIUS = 88
const LABEL_RADIUS = 112

function polarPoint(index: number, radius: number): { x: number; y: number } {
  // 从正上方开始，顺时针排布五个维度
  const angle = (Math.PI * 2 * index) / STAT_KEYS.length - Math.PI / 2
  return {
    x: CENTER + radius * Math.cos(angle),
    y: CENTER + radius * Math.sin(angle),
  }
}

function polygonPoints(radius: number): string {
  return STAT_KEYS.map((_, index) => {
    const { x, y } = polarPoint(index, radius)
    return `${x},${y}`
  }).join(' ')
}

function labelAnchor(index: number): 'start' | 'middle' | 'end' {
  const { x } = polarPoint(index, 1)
  if (Math.abs(x) < 0.35) return 'middle'
  return x > 0 ? 'start' : 'end'
}

/** 四角星路径：让属性顶点像手绘星标 */
function starPath(cx: number, cy: number, r: number): string {
  const inner = r * 0.38
  const points: string[] = []
  for (let i = 0; i < 8; i += 1) {
    const radius = i % 2 === 0 ? r : inner
    const angle = (Math.PI / 4) * i - Math.PI / 2
    points.push(`${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`)
  }
  return `M${points.join(' L')} Z`
}

interface StatsRadarProps {
  values: StatValues
}

export function StatsRadar({ values }: StatsRadarProps) {
  const greatest = Math.max(20, ...STAT_KEYS.map((key) => values[key]))
  const scaleMax = Math.ceil(greatest / 20) * 20

  const valuePoints = STAT_KEYS.map((key, index) => {
    const ratio = Math.min(values[key] / scaleMax, 1)
    const { x, y } = polarPoint(index, ratio * RADIUS)
    return `${x},${y}`
  }).join(' ')

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="mx-auto w-full max-w-[300px]"
      role="img"
      aria-label="五维属性星图"
    >
      {/* 网格环：虚线墨线 */}
      {[0.33, 0.66, 1].map((ratio) => (
        <polygon
          key={ratio}
          points={polygonPoints(RADIUS * ratio)}
          fill={ratio === 1 ? 'rgb(63 111 82 / 0.04)' : 'none'}
          stroke="#cfc3a7"
          strokeWidth="1"
          strokeDasharray={ratio === 1 ? 'none' : '3 4'}
        />
      ))}

      {/* 轴线 */}
      {STAT_KEYS.map((key, index) => {
        const { x, y } = polarPoint(index, RADIUS)
        return (
          <line
            key={key}
            x1={CENTER}
            y1={CENTER}
            x2={x}
            y2={y}
            stroke="#cfc3a7"
            strokeWidth="1"
            strokeDasharray="2 4"
          />
        )
      })}

      {/* 属性多边形 */}
      <polygon
        points={valuePoints}
        fill="rgb(63 111 82 / 0.14)"
        stroke="#3f6f52"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* 顶点星标 */}
      {STAT_KEYS.map((key, index) => {
        const ratio = Math.min(values[key] / scaleMax, 1)
        const { x, y } = polarPoint(index, ratio * RADIUS)
        return (
          <g key={key}>
            <path d={starPath(x, y, 7)} fill={STAT_COLORS[key]} stroke="#fbf7ee" strokeWidth="1.5">
              <title>{`${STAT_LABELS[key]}：${values[key]}`}</title>
            </path>
          </g>
        )
      })}

      {/* 顶点标签 */}
      {STAT_KEYS.map((key, index) => {
        const { x, y } = polarPoint(index, LABEL_RADIUS)
        const anchor = labelAnchor(index)
        return (
          <text
            key={key}
            x={x}
            y={y}
            textAnchor={anchor}
            fontSize="11"
            fill="#6f6455"
          >
            {STAT_LABELS[key]}
            <tspan
              dx="4"
              fill={STAT_COLORS[key]}
              fontWeight="700"
              fontSize="12"
            >
              {values[key]}
            </tspan>
          </text>
        )
      })}
    </svg>
  )
}
