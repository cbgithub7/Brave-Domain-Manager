import type { InputHTMLAttributes } from 'react'
import styles from './TextField.module.css'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  mono?: boolean
}

export function TextField({ mono = false, className, ...rest }: TextFieldProps): JSX.Element {
  return (
    <input
      className={[styles.field, mono ? styles.mono : '', className].filter(Boolean).join(' ')}
      {...rest}
    />
  )
}
