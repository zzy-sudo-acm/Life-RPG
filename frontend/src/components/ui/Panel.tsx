import type { HTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('min-w-0 rounded-xl border border-line bg-surface', className)}
      {...props}
    />
  )
}
