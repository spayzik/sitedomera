import { useState, type InputHTMLAttributes } from 'react'
import { formatPhone, isValidPhone } from '../lib/phone'

export function PhoneInput({
  invalid,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  const [value, setValue] = useState('')

  return (
    <input
      {...props}
      name="phone"
      inputMode="tel"
      autoComplete="tel"
      value={value}
      placeholder={props.placeholder || '+7 (___) ___-__-__'}
      onChange={(e) => setValue(formatPhone(e.target.value))}
      style={{
        ...props.style,
        borderBottomColor: invalid && !isValidPhone(value) && value ? 'var(--err)' : undefined,
      }}
    />
  )
}