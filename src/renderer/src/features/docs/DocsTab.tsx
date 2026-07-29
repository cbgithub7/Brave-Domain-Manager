import { useEffect, useRef, useState } from 'react'

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
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {failed && !loaded ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--spacing-3)',
            padding: 'var(--spacing-4)',
            textAlign: 'center'
          }}
        >
          <p>Couldn&apos;t load the documentation. Check your internet connection.</p>
          <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
            <button type="button" onClick={handleRetry}>
              Try again
            </button>
            <a href={DOC_URL} target="_blank" rel="noreferrer">
              Open in browser instead
            </a>
          </div>
        </div>
      ) : (
        <iframe
          key={attempt}
          src={DOC_URL}
          title="Documentation"
          onLoad={handleLoad}
          style={{ flex: 1, border: 'none', width: '100%', height: '100%' }}
        />
      )}
    </div>
  )
}
