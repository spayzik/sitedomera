import { useEffect, useRef } from 'react'

const dialogs: HTMLElement[] = []
let previousOverflow = ''
const focusable = 'button:not(:disabled), a[href], input:not(:disabled), select, textarea, [tabindex="0"]'

// Share the scroll lock across overlapping menu, drawer and product dialogs.
export function useDialog(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  const close = useRef(onClose)
  useEffect(() => { close.current = onClose }, [onClose])

  useEffect(() => {
    const element = ref.current
    if (!open || !element) return
    const previousFocus = document.activeElement as HTMLElement | null
    if (!dialogs.length) {
      previousOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }
    dialogs.push(element)
    const controls = () => [...element.querySelectorAll<HTMLElement>(focusable)]
      .filter(control => control.getClientRects().length > 0)
    const frame = requestAnimationFrame(() => (controls()[0] ?? element).focus({ preventScroll: true }))
    const keydown = (event: KeyboardEvent) => {
      if (dialogs.at(-1) !== element) return
      if (event.key === 'Escape') {
        event.preventDefault()
        close.current()
      } else if (event.key === 'Tab') {
        const list = controls()
        const first = list[0] ?? element
        const last = list.at(-1) ?? element
        if (!element.contains(document.activeElement) || (event.shiftKey && document.activeElement === first)) {
          event.preventDefault()
          ;(event.shiftKey ? last : first).focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', keydown)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', keydown)
      dialogs.splice(dialogs.indexOf(element), 1)
      if (!dialogs.length) {
        document.body.style.overflow = previousOverflow
        if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
      }
    }
  }, [open])
  return ref
}
