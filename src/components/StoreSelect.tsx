import { Children, isValidElement, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import './StoreSelect.css'

type Option = { value: string; children: ReactNode }

export function StoreSelect({ id, label, value, onChange, children }: {
  id?: string
  label?: string
  value: string
  onChange: (value: string) => void
  children: ReactNode
}) {
  const listId = useId()
  const trigger = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [above, setAbove] = useState(false)
  const options = Children.toArray(children).flatMap(child =>
    isValidElement<Option>(child) ? [child.props] : [])
  const selected = options.findIndex(option => option.value === value)

  function show(index: number) {
    const bounds = trigger.current?.getBoundingClientRect()
    setAbove(Boolean(bounds && window.innerHeight - bounds.bottom < Math.min(options.length * 42 + 12, 250) && bounds.top > window.innerHeight - bounds.bottom))
    setOpen(true)
    requestAnimationFrame(() => list.current?.querySelectorAll('button')[Math.max(0, index)]?.focus())
  }

  function close() {
    setOpen(false)
    trigger.current?.focus()
  }

  function move(event: KeyboardEvent<HTMLDivElement>) {
    const buttons = Array.from(list.current?.querySelectorAll('button') ?? [])
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
    const target = event.key === 'ArrowDown' ? Math.min(index + 1, buttons.length - 1)
      : event.key === 'ArrowUp' ? Math.max(index - 1, 0)
      : event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : -1
    if (target < 0) return
    event.preventDefault()
    buttons[target]?.focus()
  }

  return <div className="store-select" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
  }} onKeyDown={event => {
    if (open && event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      close()
    }
  }}>
    <button id={id} ref={trigger} type="button" className="store-select-trigger" aria-expanded={open}
      aria-haspopup="listbox" aria-controls={open ? listId : undefined} aria-label={label}
      onClick={() => open ? close() : show(selected)}
      onKeyDown={event => {
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
        event.preventDefault()
        show(selected >= 0 ? selected : event.key === 'ArrowUp' ? options.length - 1 : 0)
      }}>
      <span>{options[selected]?.children ?? options[0]?.children}</span><ChevronDown size={16} aria-hidden="true" />
    </button>
    {open && <div ref={list} id={listId} role="listbox" aria-label={label ?? 'Варианты'}
      className={above ? 'store-select-options is-above' : 'store-select-options'} onKeyDown={move}>
      {options.map(option => <button key={option.value} type="button" role="option" tabIndex={-1}
        aria-selected={option.value === value} onClick={() => { onChange(option.value); close() }}>
        <span>{option.children}</span>{option.value === value && <Check size={15} aria-hidden="true" />}
      </button>)}
    </div>}
  </div>
}
