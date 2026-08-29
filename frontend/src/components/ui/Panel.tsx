import type { HTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'min-w-0 rounded-2xl bg-surface shadow-[0_1px_4px_rgb(0_0_0/0.04)]',
        className,
      )}
      {...props}
    />
  )
}
