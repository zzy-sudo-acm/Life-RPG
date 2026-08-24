import { clamp } from '../../utils/format'

interface ProgressBarProps {
  value: number
  max?: number
  tone?: 'primary' | 'exp' | 'danger'
  label?: string
}
const tones = {
  primary: 'bg-primary',
  exp: 'bg-exp',
  danger: 'bg-danger',
} as const

export function ProgressBar({ value, max = 100, tone = 'primary', label }: ProgressBarProps) {
  const percentage = max > 0 ? clamp((value / max) * 100, 0, 100) : 0
  return (
    <div className="space-y-1.5">
      {label ? (
        <div className="flex justify-between text-xs text-muted">
          <span>{label}</span>
          <span>{Math.round(percentage)}%</span>
        </div>
      ) : null}
      <div
        className="h-2 overflow-hidden rounded-full bg-[#e7ebe8]"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
      >
        <div
          className={`h-full rounded-full transition-[width] ${tones[tone]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
