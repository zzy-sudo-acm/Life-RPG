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

/** 渐变填充 + 流光动画 + 末端辉光；danger 带呼吸，给 Boss 血条危机感。 */
const tones = {
  primary:
    'bg-[linear-gradient(90deg,#d99a1f,#f5b83d,#ffd97a,#f5b83d,#d99a1f)] bg-[length:200%_100%] animate-shimmer shadow-[0_0_8px_rgb(245_184_61/0.45)]',
  danger:
    'bg-[linear-gradient(90deg,#c92a42,#ff5468,#ff8f9d,#ff5468,#c92a42)] bg-[length:200%_100%] animate-shimmer animate-pulse-glow shadow-[0_0_10px_rgb(255_84_104/0.5)]',
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
