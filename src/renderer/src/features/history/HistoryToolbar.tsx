import type { HistoryStatus } from '@shared/history-types'
import { Button } from '../../components/Button'
import styles from './HistoryToolbar.module.css'

interface HistoryToolbarProps {
  status: HistoryStatus
  onUndo: () => void
  onRedo: () => void
  error: string | null
}

export function HistoryToolbar({ status, onUndo, onRedo, error }: HistoryToolbarProps): JSX.Element {
  return (
    <div className={styles.bar}>
      <Button onClick={onUndo} disabled={!status.canUndo} title={status.undoLabel ?? 'Nothing to undo'}>
        ↶ Undo{status.undoLabel ? `: ${status.undoLabel}` : ''}
      </Button>
      <Button onClick={onRedo} disabled={!status.canRedo} title={status.redoLabel ?? 'Nothing to redo'}>
        ↷ Redo{status.redoLabel ? `: ${status.redoLabel}` : ''}
      </Button>
      {error && <span className={styles.error}>{error}</span>}
    </div>
  )
}
