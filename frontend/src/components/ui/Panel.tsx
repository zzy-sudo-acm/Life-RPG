import type { HTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  /** 金色外发光，给核心反馈卡片用（主要目标、角色档案等）。 */
  glow?: boolean
}

export function Panel({ className, glow = false, ...props }: PanelProps) {
  return (
    <div
      className={cn(
        'min-w-0 rounded-2xl bg-surface shadow-[inset_0_1px_0_rgb(255_255_255/0.05)] ring-1 ring-white/8',
        glow && 'shadow-[inset_0_1px_0_rgb(255_255_255/0.06),0_0_44px_rgb(245_184_61/0.09)] ring-primary/25',
        className,
      )}
      {...props}
    />
  )
}
