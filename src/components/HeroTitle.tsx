import { Fragment } from 'react'

export function HeroTitle({ lines }: { lines: string[] }) {
  return (
    <h1 className="hero-enter-title">
      {lines.map((line, index) => (
        <Fragment key={line}>
          {index > 0 && ' '}
          <span className="editorial-mask"><span className="editorial-line">{line}</span></span>
        </Fragment>
      ))}
    </h1>
  )
}
