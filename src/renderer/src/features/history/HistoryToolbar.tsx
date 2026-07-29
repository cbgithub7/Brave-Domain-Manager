import type { HistoryStatus } from '@shared/history-types'

interface HistoryToolbarProps {
  status: HistoryStatus
  onUndo: () => void
  onRedo: () => void
  error: string | null
}

export function HistoryToolbar({ status, onUndo, onRedo, error }: HistoryToolbarProps): JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-2)',
        padding: 'var(--spacing-2) var(--spacing-4)',
        borderBottom: '1px solid var(--color-border)'
      }}
    >
      <button
        type="button"
        onClick={onUndo}
        disabled={!status.canUndo}
        title={status.undoLabel ?? 'Nothing to undo'}
      >
        ↶ Undo{status.undoLabel ? `: ${status.undoLabel}` : ''}
      </button>
      <button
        type="button"
        onClick={onRedo}
        disabled={!status.canRedo}
        title={status.redoLabel ?? 'Nothing to redo'}
      >
        ↷ Redo{status.redoLabel ? `: ${status.redoLabel}` : ''}
      </button>
      {error && <span style={{ color: 'var(--color-danger)' }}>{error}</span>}
    </div>
  )
}
