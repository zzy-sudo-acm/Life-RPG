import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../utils/cn'

const variants = {
  primary: 'border-primary bg-primary text-white hover:bg-[#115a40]',
  secondary: 'border-line bg-white text-ink hover:border-primary hover:text-primary',
  ghost: 'border-transparent bg-transparent text-muted hover:bg-primary-soft hover:text-primary',
  danger: 'border-danger bg-danger text-white hover:bg-[#ad3d37]',
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
        'inline-flex min-h-10 items-center justify-center gap-2 rounded-[10px] border px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50',
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
