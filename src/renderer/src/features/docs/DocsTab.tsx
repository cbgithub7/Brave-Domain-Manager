import { useEffect, useRef, useState } from 'react'
import { Button } from '../../components/Button'
import styles from './DocsTab.module.css'

const DOC_URL = 'https://cbgithub7.github.io/Brave-Domain-Manager/'
const LOAD_TIMEOUT_MS = 8000

export function DocsTab(): JSX.Element {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const loadedRef = useRef(false)

  useEffect(() => {
    loadedRef.current = false
    setLoaded(false)
    setFailed(false)

    const timer = window.setTimeout(() => {
      if (!loadedRef.current) setFailed(true)
    }, LOAD_TIMEOUT_MS)

    return () => window.clearTimeout(timer)
  }, [attempt])

  const handleLoad = (): void => {
    loadedRef.current = true
    setLoaded(true)
  }

  const handleRetry = (): void => {
    setAttempt((n) => n + 1)
  }

  return (
    <div className={styles.shell}>
      {failed && !loaded ? (
        <div className={styles.fallback}>
          <p>Couldn&apos;t load the documentation. Check your internet connection.</p>
          <div className={styles.actions}>
            <Button onClick={handleRetry}>Try again</Button>
            <a className={styles.link} href={DOC_URL} target="_blank" rel="noreferrer">
              Open in browser instead
            </a>
          </div>
        </div>
      ) : (
        <iframe key={attempt} src={DOC_URL} title="Documentation" onLoad={handleLoad} className={styles.frame} />
      )}
    </div>
  )
}
