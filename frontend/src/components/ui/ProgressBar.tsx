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
  primary: 'bg-gradient-to-r from-primary-deep to-primary shadow-[0_0_12px_rgb(62_207_142/0.45)]',
  exp: 'bg-gradient-to-r from-[#c8871d] to-exp shadow-[0_0_12px_rgb(242_178_62/0.4)]',
  danger: 'bg-gradient-to-r from-[#a63744] to-danger shadow-[0_0_12px_rgb(227_93_106/0.4)]',
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
        <div className="flex justify-between text-xs text-muted">
          <span>{label}</span>
          <span className="tabular-nums">{Math.round(percentage)}%</span>
        </div>
      ) : null}
      <div
        className={cn('overflow-hidden rounded-full bg-white/8', sizes[size])}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-700', tones[tone])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
