import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../utils/cn'

const variants = {
  primary:
    'bg-primary font-semibold text-[#241a04] shadow-[0_0_20px_rgb(245_184_61/0.22)] hover:brightness-110 active:opacity-80',
  secondary:
    'bg-raised text-ink ring-1 ring-white/8 hover:bg-white/10',
  ghost:
    'bg-transparent text-muted hover:bg-white/5 hover:text-ink',
  danger:
    'bg-danger-soft text-danger hover:bg-danger/20',
} as const

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants
  icon?: ReactNode
}
export function Button({
  className,
  variant = 'primary',
  icon,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex min-h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-45',
        variants[variant],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  )
}
