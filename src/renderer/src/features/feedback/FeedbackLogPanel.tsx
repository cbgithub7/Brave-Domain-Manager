import { useEffect, useRef } from 'react'
import { Button } from '../../components/Button'
import { useFeedbackLog, type FeedbackLevel } from './FeedbackLogContext'
import styles from './FeedbackLogPanel.module.css'

const LEVEL_COLORS: Record<FeedbackLevel, string> = {
  info: 'var(--color-text)',
  success: 'var(--color-success)',
  warn: 'var(--color-warning)',
  error: 'var(--color-danger)'
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString()
}

export function FeedbackLogPanel(): JSX.Element {
  const { entries, clear } = useFeedbackLog()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [entries])

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span>Activity</span>
        <Button onClick={clear} title="Clear activity log">
          Clear
        </Button>
      </div>
      <div ref={scrollRef} className={styles.log}>
        {entries.length === 0 ? (
          <p className={styles.empty}>No activity yet.</p>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} style={{ color: LEVEL_COLORS[entry.level] }}>
              [{formatTime(entry.timestamp)}] {entry.message}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
