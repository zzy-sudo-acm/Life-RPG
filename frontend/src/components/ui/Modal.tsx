import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  closeDisabled?: boolean
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}

export function Modal({
  open,
  title,
  description,
  onClose,
  closeDisabled = false,
  children,
  footer,
  wide,
}: ModalProps) {
  useEffect(() => {
    if (!open) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !closeDisabled) onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [closeDisabled, onClose, open])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex h-[100dvh] items-end justify-center bg-ink/45 p-0 sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !closeDisabled) onClose()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className={`flex max-h-[100dvh] w-full animate-pop-in flex-col overflow-hidden rounded-t-2xl border border-line bg-surface shadow-[0_24px_70px_rgb(44_38_32/0.35)] sm:max-h-[92dvh] sm:rounded-xl ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'}`}
      >
        <header className="z-10 flex shrink-0 items-start justify-between gap-4 border-b border-line bg-surface/95 px-4 py-3.5 sm:px-5 sm:py-4">
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
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
          {children}
        </div>
        {footer ? (
          <footer className="z-10 shrink-0 border-t border-line bg-surface/98 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-5 sm:pb-4">
            {footer}
          </footer>
        ) : null}
      </section>
    </div>,
    document.body,
  )
}
