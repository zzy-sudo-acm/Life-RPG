import type { ReactNode } from 'react'

interface FormFieldProps {
  label: string
  htmlFor?: string
  required?: boolean
  hint?: string | undefined
  error?: string | null
  children: ReactNode
}

export function FormField({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
}: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
        {label}
        {required ? <span className="ml-1 text-danger">*</span> : null}
      </label>
      {children}
      {error ? (
        <p id={htmlFor ? `${htmlFor}-error` : undefined} role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
      {hint ? <p className="text-xs text-faint">{hint}</p> : null}
    </div>
  )
}

export const inputClassName =
  'min-h-10 w-full rounded-xl border border-line bg-canvas/70 px-3 text-sm text-ink outline-none transition-colors placeholder:text-faint focus:border-primary/70 focus:ring-2 focus:ring-primary/20 disabled:bg-white/5 disabled:text-muted'

export const textareaClassName = `${inputClassName} min-h-24 resize-y py-2.5`
