import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../utils/cn'

const variants = {
  primary:
    'border-primary-deep bg-primary text-[#f7f2e6] font-semibold shadow-[0_2px_0_rgb(31_51_40/0.9)] hover:bg-primary-deep active:translate-y-px active:shadow-none',
  gold:
    'border-[#8a6316] bg-exp text-[#fdf8ec] font-semibold shadow-[0_2px_0_rgb(122_88_16/0.9)] hover:bg-[#96690f] active:translate-y-px active:shadow-none',
  dangerSolid:
    'border-[#93301c] bg-danger text-[#fdf3ee] font-semibold shadow-[0_2px_0_rgb(126_39_20/0.9)] hover:bg-[#a83720] active:translate-y-px active:shadow-none',
  secondary:
    'border-line bg-surface text-ink hover:border-ink/35 hover:bg-raised/60',
  ghost:
    'border-transparent bg-transparent text-muted hover:bg-ink/5 hover:text-ink',
  danger:
    'border-danger/50 bg-danger-soft text-danger hover:bg-danger/15',
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
        'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-medium transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-45 disabled:active:translate-y-0',
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
