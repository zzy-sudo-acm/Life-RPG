import type { ReactNode } from 'react'
import { clamp } from '../../utils/format'

interface ProgressRingProps {
  value: number
  max?: number
  size?: number
  strokeWidth?: number
  tone?: 'primary' | 'exp' | 'danger'
  /** 环中心内容（通常是百分比或数值） */
  children?: ReactNode
  ariaLabel?: string
}

const tones = {
  primary: '#3f6f52',
  exp: '#a97c1f',
  danger: '#bd4229',
} as const

/** 纸面风格的环形进度：墨线轨道 + 单色填充弧。 */
export function ProgressRing({
  value,
  max = 100,
  size = 64,
  strokeWidth = 6,
  tone = 'primary',
  children,
  ariaLabel,
}: ProgressRingProps) {
  const ratio = max > 0 ? clamp(value / max, 0, 1) : 0
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label={ariaLabel}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#ddd2ba"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={tones[tone]}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center">{children}</span>
    </span>
  )
}
