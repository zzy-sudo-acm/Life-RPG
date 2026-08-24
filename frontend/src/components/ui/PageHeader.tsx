import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  action?: ReactNode
  eyebrow?: string
}
export function PageHeader({ title, description, action, eyebrow }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? (
          <p className="mb-1.5 font-display text-[11px] font-bold uppercase tracking-[0.32em] text-danger">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          {title}
        </h1>
        {description ? <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted">{description}</p> : null}
      </div>
      {action}
    </header>
  )
}
