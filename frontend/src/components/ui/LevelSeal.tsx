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

/** 等级徽标：深色圆角方块，像一枚克制的 app 图标。 */
export function LevelSeal({ level, size = 'md', className }: LevelSealProps) {
  return (
    <span
      className={cn(
        'flex shrink-0 select-none flex-col items-center justify-center rounded-[26%] bg-ink font-bold leading-none text-white',
        sizes[size],
        className,
      )}
      aria-label={`等级 ${level}`}
    >
      <span className="text-[8px] font-medium tracking-widest opacity-60">LV</span>
      <span className="tabular-nums">{level}</span>
    </span>
  )
}
