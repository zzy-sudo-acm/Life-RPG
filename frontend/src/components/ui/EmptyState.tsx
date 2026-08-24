import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  description: string
  action?: ReactNode
  icon?: ReactNode
}
export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center rounded-2xl border border-dashed border-line/90 bg-surface/40 px-5 py-10 text-center">
      {icon ? (
        <div className="mb-3 flex size-12 items-center justify-center rounded-2xl border border-line bg-raised/70 text-faint">
          {icon}
        </div>
      ) : null}
      <h3 className="font-medium text-ink">{title}</h3>
      <p className="mt-1 max-w-md text-sm leading-6 text-muted">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
