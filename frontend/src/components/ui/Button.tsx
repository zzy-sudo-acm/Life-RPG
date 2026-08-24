import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../utils/cn'

const variants = {
  primary:
    'border-primary/70 bg-gradient-to-b from-primary to-primary-deep text-[#07130d] font-semibold shadow-[0_4px_18px_rgb(62_207_142/0.28)] hover:brightness-110',
  gold:
    'border-exp/60 bg-gradient-to-b from-exp to-[#c8871d] text-[#241600] font-semibold shadow-[0_4px_18px_rgb(242_178_62/0.25)] hover:brightness-110',
  dangerSolid:
    'border-danger/60 bg-gradient-to-b from-danger to-[#a63744] text-white font-semibold shadow-[0_4px_18px_rgb(227_93_106/0.25)] hover:brightness-110',
  secondary:
    'border-line bg-raised/70 text-ink hover:border-primary/60 hover:text-primary',
  ghost:
    'border-transparent bg-transparent text-muted hover:bg-white/6 hover:text-ink',
  danger:
    'border-danger/70 bg-danger/15 text-danger hover:bg-danger/25',
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
        'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-medium transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100',
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
