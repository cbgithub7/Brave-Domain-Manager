import type { ReactNode } from 'react'
import styles from './Pill.module.css'

interface PillProps {
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'muted'
  live?: boolean
  children: ReactNode
}

/** A small status chip - encodes state as shape+color, not just a number to parse. */
export function Pill({ tone = 'neutral', live = false, children }: PillProps): JSX.Element {
  const toneClass = styles[tone]
  return (
    <span className={[styles.pill, toneClass].filter(Boolean).join(' ')}>
      {live && <span className={styles.dot} aria-hidden="true" />}
      {children}
    </span>
  )
}
