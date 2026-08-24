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

/** 朱文印风格的等级印章：旋转方印，印泥质感。 */
export function LevelSeal({ level, size = 'md', className }: LevelSealProps) {
  return (
    <span
      className={cn(
        'seal flex shrink-0 select-none flex-col items-center justify-center rounded-[6px] font-bold leading-none',
        sizes[size],
        className,
      )}
      aria-label={`等级 ${level}`}
    >
      <span className="text-[8px] font-medium tracking-widest opacity-80">LV</span>
      <span className="tabular-nums">{level}</span>
    </span>
  )
}
