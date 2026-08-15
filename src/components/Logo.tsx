export function LogoIcon({ size = 28, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      style={{ width: `${size}px`, height: `${size}px`, color: 'var(--accent)', ...style }}
      aria-hidden="true"
    >
      {/* Стилизованный логотип из линий (домики) */}
      <path d="M25 80 V45 L40 30 V80" />
      <path d="M32 80 V40" />
      <path d="M40 80 V25 L60 15 V80" />
      <path d="M47 80 V21" />
      <path d="M54 80 V18" />
      <path d="M60 80 V35 L75 45 V80" />
      <path d="M68 80 V40" />
      {/* Золотой круг */}
      <circle cx="50" cy="50" r="48" strokeWidth="1.5" stroke="var(--accent)" strokeOpacity="0.5" />
    </svg>
  )
}