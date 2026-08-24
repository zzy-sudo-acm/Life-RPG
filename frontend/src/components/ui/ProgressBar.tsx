import { clamp } from '../../utils/format'
import { cn } from '../../utils/cn'

interface ProgressBarProps {
  value: number
  max?: number
  tone?: 'primary' | 'exp' | 'danger'
  label?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const tones = {
  primary: 'bg-primary',
  exp: 'bg-exp',
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
          <span className="whitespace-nowrap">{label}</span>
          <span className="shrink-0 tabular-nums">{Math.round(percentage)}%</span>
        </div>
      ) : null}
      <div
        className={cn(
          'relative overflow-hidden rounded-sm border border-ink/12 bg-ink/8',
          sizes[size],
        )}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
      >
        <div
          className={cn('h-full transition-[width] duration-700', tones[tone])}
          style={{ width: `${percentage}%` }}
        />
        {/* 刻度线：让进度条像手账里的量尺 */}
        {size === 'lg' ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                'repeating-linear-gradient(90deg, transparent 0 calc(10% - 1px), rgb(44 38 32 / 0.12) calc(10% - 1px) 10%)',
            }}
          />
        ) : null}
      </div>
    </div>
  )
}
