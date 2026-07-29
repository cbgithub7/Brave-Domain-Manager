import type { ReactNode } from 'react'
import styles from './Card.module.css'

export function Card({ children }: { children: ReactNode }): JSX.Element {
  return <div className={styles.card}>{children}</div>
}

export function CardHead({ children }: { children: ReactNode }): JSX.Element {
  return <div className={styles.head}>{children}</div>
}

export function CardSpacer(): JSX.Element {
  return <span className={styles.spacer} />
}

export function CardBody({ tight = false, children }: { tight?: boolean; children: ReactNode }): JSX.Element {
  return <div className={tight ? styles.bodyTight : styles.body}>{children}</div>
}
