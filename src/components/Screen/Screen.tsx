import type { ReactNode } from 'react'
import './Screen.css'

export interface ScreenProps {
  children?: ReactNode
  /** Play the collapse-to-a-line power-on animation on mount. */
  turnOn?: boolean
  /** Play the collapse power-off animation. */
  turnOff?: boolean
  /** Kill the phosphor entirely — a dark, reflective tube. */
  off?: boolean
  /** Briefly apply RGB-split interference. Bump the key to re-trigger. */
  glitchKey?: number | string
}

export function Screen({
  children,
  turnOn = false,
  turnOff = false,
  off = false,
  glitchKey,
}: ScreenProps) {
  const classes = ['crt', 'crt--fx']
  if (turnOn) classes.push('crt--turn-on')
  if (turnOff) classes.push('crt--turn-off')
  if (off) classes.push('crt--off')
  if (glitchKey !== undefined) classes.push('crt--glitch')

  return (
    <div className={classNames(['screen', ...classes])}>
      <div className="crt__content">{children}</div>
    </div>
  )
}

function classNames(list: readonly string[]): string {
  return list.join(' ')
}
