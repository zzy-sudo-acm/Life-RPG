import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'

interface ModalProps {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  closeDisabled?: boolean
  children: ReactNode
  wide?: boolean
}

export function Modal({
  open,
  title,
  description,
  onClose,
  closeDisabled = false,
  children,
  wide,
}: ModalProps) {
  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !closeDisabled) onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [closeDisabled, onClose, open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 p-0 sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !closeDisabled) onClose()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className={`max-h-[92vh] w-full animate-pop-in overflow-y-auto rounded-t-2xl border border-line bg-surface shadow-[0_24px_70px_rgb(44_38_32/0.35)] sm:rounded-xl ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'}`}
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line bg-surface/95 px-5 py-4">
          <div>
            <h2 id="dialog-title" className="font-display text-lg font-bold text-ink">
              {title}
            </h2>
            {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
          </div>
          <button
            type="button"
            aria-label="关闭"
            disabled={closeDisabled}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-ink/5 hover:text-ink disabled:opacity-40"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>
        <div className="p-5">{children}</div>
      </section>
    </div>
  )
}
