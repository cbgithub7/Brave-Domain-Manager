import type { HistoryStatus } from '@shared/history-types'
import { Pill } from '../../components/Pill'
import styles from './Inspector.module.css'

interface InspectorProps {
  domainCount: number
  historyStatus: HistoryStatus
  loggingEnabled: boolean
}

export function Inspector({ domainCount, historyStatus, loggingEnabled }: InspectorProps): JSX.Element {
  return (
    <aside className={styles.inspector} aria-label="Status">
      <div className={styles.group}>
        <h5>Status</h5>
        <div className={styles.stat}>
          <span className={styles.label}>Blocked</span>
          <span className={styles.value}>{domainCount}</span>
        </div>
      </div>

      <div className={styles.group}>
        <h5>History</h5>
        <div className={styles.stat}>
          <span className={styles.label}>Undo</span>
          <span className={styles.value}>{historyStatus.undoLabel ?? '—'}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.label}>Redo</span>
          <span className={styles.value}>{historyStatus.redoLabel ?? '—'}</span>
        </div>
      </div>

      <div className={styles.group}>
        <h5>Logging</h5>
        <Pill tone={loggingEnabled ? 'success' : 'muted'} live={loggingEnabled}>
          {loggingEnabled ? 'On' : 'Off'}
        </Pill>
      </div>
    </aside>
  )
}
