import { useEffect, useState } from 'react'
import styles from './TitleBar.module.css'

interface TitleBarProps {
  title: string
  appIcon?: string
}

export function TitleBar({ title, appIcon }: TitleBarProps): JSX.Element {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    let cancelled = false
    window.api.window.isMaximized().then((value) => {
      if (!cancelled) setIsMaximized(value)
    })
    const unsubscribe = window.api.window.onMaximizeChanged(setIsMaximized)
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  return (
    <div className={styles.titlebar} onDoubleClick={() => window.api.window.maximizeToggle()}>
      <div className={styles.iconTitle}>
        {appIcon && <img src={appIcon} className={styles.appIcon} alt="" />}
        <span className={styles.title}>{title}</span>
      </div>
      <div className={styles.buttons} onDoubleClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          className={styles.button}
          aria-label="Minimize"
          title="Minimize"
          onClick={() => window.api.window.minimize()}
        >
          <span className={`${styles.icon} ${styles.iconMinimize}`} />
        </button>
        <button
          type="button"
          className={styles.button}
          aria-label={isMaximized ? 'Restore' : 'Maximize'}
          title={isMaximized ? 'Restore' : 'Maximize'}
          onClick={() => window.api.window.maximizeToggle()}
        >
          <span className={`${styles.icon} ${isMaximized ? styles.iconRestore : styles.iconMaximize}`} />
        </button>
        <button
          type="button"
          className={`${styles.button} ${styles.closeButton}`}
          aria-label="Close"
          title="Close"
          onClick={() => window.api.window.close()}
        >
          <span className={`${styles.icon} ${styles.iconClose}`} />
        </button>
      </div>
    </div>
  )
}
