import type { HTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'min-w-0 rounded-2xl border border-line bg-surface/85 shadow-[0_10px_36px_rgb(0_0_0/0.28)] backdrop-blur-sm',
        className,
      )}
      {...props}
    />
  )
}
