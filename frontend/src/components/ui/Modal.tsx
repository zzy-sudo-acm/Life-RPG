import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
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
  const dialogRef = useRef<HTMLElement>(null)
  const triggerRef = useRef(document.activeElement instanceof HTMLElement ? document.activeElement : null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    if (!open) return undefined
    const previouslyFocused = triggerRef.current
    const dialog = dialogRef.current
    if (dialog && !dialog.contains(document.activeElement)) dialog.focus()
    return () => {
      if (previouslyFocused?.isConnected) previouslyFocused.focus()
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !closeDisabled) onClose()
      if (event.key !== 'Tab') return
      const dialog = dialogRef.current
      if (!dialog) return
      const focusable = [...dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], summary, [tabindex]:not([tabindex="-1"])',
      )].filter((element) => element.getClientRects().length > 0 && element.tabIndex >= 0)
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (!first || !last) {
        event.preventDefault()
        dialog.focus()
      } else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog)) {
        event.preventDefault()
        first.focus()
      }
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
      className="fixed inset-0 z-50 flex h-[100dvh] items-end justify-center bg-ink/35 p-0 backdrop-blur-[3px] sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !closeDisabled) onClose()
      }}
    >
      <section
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={`flex max-h-[95%] w-full animate-pop-in flex-col overflow-hidden rounded-t-3xl border border-line bg-surface shadow-[0_20px_65px_rgb(36_62_53/0.14)] outline-none motion-reduce:animate-none sm:max-h-[92dvh] sm:rounded-2xl ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'}`}
      >
        <header className="z-10 flex shrink-0 items-start justify-between gap-4 border-b border-line px-4 py-3.5 sm:px-5 sm:py-4">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-ink">
              {title}
            </h2>
            {description ? <p id={descriptionId} className="mt-1 text-sm text-muted">{description}</p> : null}
          </div>
          <button
            type="button"
            aria-label="关闭"
            disabled={closeDisabled}
            className="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-raised hover:text-ink focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-40"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>
        <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 ${footer ? '' : 'pb-[max(1rem,env(safe-area-inset-bottom))]'}`}>
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
