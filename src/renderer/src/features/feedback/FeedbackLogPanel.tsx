import { useEffect, useRef } from 'react'
import { useFeedbackLog, type FeedbackLevel } from './FeedbackLogContext'

const LEVEL_COLORS: Record<FeedbackLevel, string> = {
  info: 'var(--color-text)',
  success: 'var(--color-text)',
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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 140,
        borderTop: '1px solid var(--color-border)',
        flexShrink: 0
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 'var(--spacing-1) var(--spacing-4)',
          fontSize: '11px',
          color: 'var(--color-text-muted)'
        }}
      >
        <span>Activity</span>
        <button type="button" onClick={clear} title="Clear activity log">
          Clear
        </button>
      </div>
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '0 var(--spacing-4) var(--spacing-2)',
          fontSize: '12px',
          fontFamily: 'Consolas, monospace'
        }}
      >
        {entries.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)' }}>No activity yet.</p>
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
