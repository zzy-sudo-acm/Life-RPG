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

/** 等级徽章：金边黑底的勋章，带轻微金色外发光。 */
export function LevelSeal({ level, size = 'md', className }: LevelSealProps) {
  return (
    <span
      className={cn(
        'flex shrink-0 select-none flex-col items-center justify-center rounded-[26%] bg-[linear-gradient(160deg,#33290f,#15100a)] font-bold leading-none text-primary shadow-[0_0_18px_rgb(245_184_61/0.28),inset_0_1px_0_rgb(255_255_255/0.1)] ring-1 ring-primary/50',
        sizes[size],
        className,
      )}
      aria-label={`等级 ${level}`}
    >
      <span className="text-[8px] font-medium tracking-widest text-primary/60">LV</span>
      <span className="tabular-nums">{level}</span>
    </span>
  )
}
