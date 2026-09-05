import { useId } from 'react'
import { STAT_KEYS, STAT_LABELS, type StatValues } from '../../types/models'
import { STAT_HEX } from './statTheme'

interface RadarChartProps {
  values: StatValues
  /** viewBox 边长，标签空间已预留在内，移动端等比缩放不裁切。 */
  size?: number
}

const RING_STEPS = [0.25, 0.5, 0.75, 1]

/** 五维属性雷达图：浅色刻度与半透明森林绿区域。 */
export function RadarChart({ values, size = 280 }: RadarChartProps) {
  const fillId = useId()
  const center = size / 2
  const radius = size / 2 - 58
  const maxValue = Math.max(100, ...STAT_KEYS.map((key) => values[key]))
  const scale = Math.ceil(maxValue / 20) * 20

  const point = (index: number, ratio: number) => {
    const angle = ((-90 + index * 72) * Math.PI) / 180
    return [center + radius * ratio * Math.cos(angle), center + radius * ratio * Math.sin(angle)] as const
  }
  const polygon = (ratio: (index: number) => number) =>
    STAT_KEYS.map((_, index) => point(index, ratio(index)).join(',')).join(' ')
  const dataPoints = STAT_KEYS.map((key, index) => {
    const ratio = Math.min(1, values[key] / scale)
    return { key, ratio, position: point(index, ratio) }
  })

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="h-auto w-full"
      role="img"
      aria-label={STAT_KEYS.map((key) => `${STAT_LABELS[key]} ${values[key]}`).join('，')}
    >
      <defs>
        <radialGradient id={fillId} cx="50%" cy="50%" r="65%">
          <stop offset="0%" stopColor="#32745c" stopOpacity="0.24" />
          <stop offset="100%" stopColor="#32745c" stopOpacity="0.07" />
        </radialGradient>
      </defs>

      <polygon points={polygon(() => 1)} fill="#f5f7f4" />
      {RING_STEPS.map((step) => (
        <polygon
          key={step}
          points={polygon(() => step)}
          fill="none"
          stroke="#e3e9e2"
          strokeWidth="1"
        />
      ))}
      {STAT_KEYS.map((key, index) => {
        const [x, y] = point(index, 1)
        return <line key={key} x1={center} y1={center} x2={x} y2={y} stroke="#e3e9e2" strokeWidth="1" />
      })}

      <polygon
        points={polygon((index) => dataPoints[index]?.ratio ?? 0)}
        fill={`url(#${fillId})`}
        stroke="#32745c"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {dataPoints.map(({ key, position }) => (
        <circle key={key} cx={position[0]} cy={position[1]} r="3" fill={STAT_HEX[key]} stroke="white" strokeWidth="1.5" />
      ))}

      {/* 标签双行（名称 + 数值），窄屏下宽度最紧的侧面标签也不溢出 */}
      {STAT_KEYS.map((key, index) => {
        const [x, y] = point(index, 1.34)
        const cos = Math.cos(((-90 + index * 72) * Math.PI) / 180)
        const anchor = cos > 0.3 ? 'start' : cos < -0.3 ? 'end' : 'middle'
        return (
          <text key={key} x={x} y={y} textAnchor={anchor} fontSize="11" dominantBaseline="middle">
            <tspan fill="#77847c">{STAT_LABELS[key]}</tspan>
            <tspan x={x} dy="1.25em" fill={STAT_HEX[key]} fontWeight="700">{values[key]}</tspan>
          </text>
        )
      })}
    </svg>
  )
}
