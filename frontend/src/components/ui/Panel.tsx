import type { HTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'min-w-0 rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgb(44_38_32/0.05),0_10px_28px_rgb(44_38_32/0.07)]',
        className,
      )}
      {...props}
    />
  )
}
