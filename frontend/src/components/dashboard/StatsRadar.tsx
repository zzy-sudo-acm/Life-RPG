import { STAT_KEYS, STAT_LABELS, type StatValues } from '../../types/models'
import { STAT_COLORS } from './statPalette'

const SIZE = 260
const CENTER = SIZE / 2
const RADIUS = 92
const LABEL_RADIUS = 116

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
      aria-label="五维属性雷达图"
    >
      <defs>
        <radialGradient id="radar-fill" cx="50%" cy="50%" r="65%">
          <stop offset="0%" stopColor="#3ecf8e" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#3ecf8e" stopOpacity="0.06" />
        </radialGradient>
      </defs>

      {/* 网格环 */}
      {[0.33, 0.66, 1].map((ratio) => (
        <polygon
          key={ratio}
          points={polygonPoints(RADIUS * ratio)}
          fill={ratio === 1 ? 'rgb(255 255 255 / 0.02)' : 'none'}
          stroke="#2c3852"
          strokeWidth="1"
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
            stroke="#2c3852"
            strokeWidth="1"
          />
        )
      })}

      {/* 属性多边形 */}
      <polygon
        points={valuePoints}
        fill="url(#radar-fill)"
        stroke="#3ecf8e"
        strokeWidth="2"
        strokeLinejoin="round"
        style={{ filter: 'drop-shadow(0 0 10px rgb(62 207 142 / 0.35))' }}
      />

      {/* 顶点 */}
      {STAT_KEYS.map((key, index) => {
        const ratio = Math.min(values[key] / scaleMax, 1)
        const { x, y } = polarPoint(index, ratio * RADIUS)
        return (
          <circle
            key={key}
            cx={x}
            cy={y}
            r="3.5"
            fill={STAT_COLORS[key]}
            stroke="#090d16"
            strokeWidth="1.5"
          >
            <title>{`${STAT_LABELS[key]}：${values[key]}`}</title>
          </circle>
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
            fill="#98a1b6"
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
