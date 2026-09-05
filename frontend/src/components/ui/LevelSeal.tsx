import { cn } from '../../utils/cn'

interface LevelSealProps {
  level: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = {
  sm: 'size-8 text-sm',
  md: 'size-10 text-base',
  lg: 'size-14 text-xl',
} as const

/** 等级徽章：自然圆形，使用淡绿底与森林绿文字。 */
export function LevelSeal({ level, size = 'md', className }: LevelSealProps) {
  return (
    <span
      className={cn(
        'flex shrink-0 select-none flex-col items-center justify-center rounded-full border border-primary/15 bg-primary-soft font-bold leading-none text-primary',
        sizes[size],
        className,
      )}
      aria-label={`等级 ${level}`}
    >
      <span className="mb-0.5 text-[8px] font-medium tracking-widest text-primary">LV</span>
      <span className="tabular-nums">{level}</span>
    </span>
  )
}
