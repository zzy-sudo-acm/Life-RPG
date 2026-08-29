import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
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
  const overlayRef = useRef<HTMLDivElement>(null)

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

  // 移动端软键盘弹出时，把遮罩层钉在可视区域内，避免弹窗被键盘遮挡。
  useEffect(() => {
    if (!open) return undefined
    const viewport = window.visualViewport
    const overlay = overlayRef.current
    if (!viewport || !overlay) return undefined
    const pin = () => {
      overlay.style.height = `${viewport.height}px`
      overlay.style.transform = `translateY(${viewport.offsetTop}px)`
    }
    pin()
    viewport.addEventListener('resize', pin)
    viewport.addEventListener('scroll', pin)
    return () => {
      viewport.removeEventListener('resize', pin)
      viewport.removeEventListener('scroll', pin)
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex h-[100dvh] items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !closeDisabled) onClose()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className={`flex max-h-full w-full animate-pop-in flex-col overflow-hidden rounded-t-3xl bg-surface shadow-[0_24px_70px_rgb(0_0_0/0.25)] sm:max-h-[92dvh] sm:rounded-2xl ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'}`}
      >
        <header className="z-10 flex shrink-0 items-start justify-between gap-4 border-b border-line px-4 py-3.5 sm:px-5 sm:py-4">
          <div>
            <h2 id="dialog-title" className="text-lg font-semibold text-ink">
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
          <footer className="z-10 shrink-0 border-t border-line px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-5 sm:pb-4">
            {footer}
          </footer>
        ) : null}
      </section>
    </div>,
    document.body,
  )
}
