import type { ButtonHTMLAttributes, ReactNode } from 'react'
import styles from './Button.module.css'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'danger'
  children: ReactNode
}

export function Button({ variant = 'default', className, children, ...rest }: ButtonProps): JSX.Element {
  const variantClass = variant === 'primary' ? styles.primary : variant === 'danger' ? styles.danger : ''
  return (
    <button type="button" className={[styles.btn, variantClass, className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </button>
  )
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  children: ReactNode
}

export function IconButton({ label, className, children, ...rest }: IconButtonProps): JSX.Element {
  return (
    <button
      type="button"
      className={[styles.iconButton, className].filter(Boolean).join(' ')}
      aria-label={label}
      title={label}
      {...rest}
    >
      {children}
    </button>
  )
}
