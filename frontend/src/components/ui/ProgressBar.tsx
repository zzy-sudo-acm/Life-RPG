import { clamp } from '../../utils/format'
import { cn } from '../../utils/cn'

interface ProgressBarProps {
  value: number
  max?: number
  tone?: 'primary' | 'danger'
  label?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/** 平静、清晰的进度反馈，颜色区分普通目标与挑战目标。 */
const tones = {
  primary: 'bg-primary',
  danger: 'bg-danger',
} as const

const sizes = {
  sm: 'h-1.5',
  md: 'h-2',
  lg: 'h-3',
} as const

export function ProgressBar({
  value,
  max = 100,
  tone = 'primary',
  label,
  size = 'md',
  className,
}: ProgressBarProps) {
  const percentage = max > 0 ? clamp((value / max) * 100, 0, 100) : 0
  return (
    <div className={cn('space-y-1.5', className)}>
      {label ? (
        <div className="flex justify-between gap-2 text-xs text-muted">
          <span>{label}</span>
          <span className="shrink-0 tabular-nums">{Math.round(percentage)}%</span>
        </div>
      ) : null}
      <div
        className={cn('overflow-hidden rounded-full bg-primary-soft', sizes[size])}
        role="progressbar"
        aria-label={label ?? '进度'}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none', tones[tone])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
