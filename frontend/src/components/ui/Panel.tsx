import type { HTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  /** 使用淡绿色边框强调主要目标、角色档案等核心内容。 */
  glow?: boolean
}

export function Panel({ className, glow = false, ...props }: PanelProps) {
  return (
    <div
      className={cn(
        'min-w-0 rounded-[14px] border bg-surface',
        glow ? 'border-primary/20' : 'border-line',
        className,
      )}
      {...props}
    />
  )
}
