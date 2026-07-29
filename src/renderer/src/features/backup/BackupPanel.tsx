import { useState } from 'react'
import type { RestoreMode } from '@shared/backup-types'
import type { HistoryStatus } from '@shared/history-types'
import { useFeedbackLog } from '../feedback/FeedbackLogContext'

interface BackupPanelProps {
  onRestored: (status: HistoryStatus) => void
}

export function BackupPanel({ onRestored }: BackupPanelProps): JSX.Element {
  const [mode, setMode] = useState<RestoreMode>('merge')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const feedback = useFeedbackLog()

  const handleExport = async (): Promise<void> => {
    setError(null)
    setMessage(null)
    const pickResult = await window.api.backup.pickSaveFile()
    if (!pickResult.ok) {
      setError(pickResult.error.message)
      return
    }
    if (!pickResult.data) return

    setBusy(true)
    const exportResult = await window.api.backup.export(pickResult.data)
    setBusy(false)

    if (exportResult.ok) {
      const text = `Exported ${exportResult.data.count} domain(s) to ${pickResult.data}.`
      setMessage(text)
      feedback.push('success', text)
    } else {
      setError(exportResult.error.message)
      feedback.push('error', exportResult.error.message)
    }
  }

  const handleImport = async (): Promise<void> => {
    setError(null)
    setMessage(null)
    const pickResult = await window.api.backup.pickOpenFile()
    if (!pickResult.ok) {
      setError(pickResult.error.message)
      return
    }
    if (!pickResult.data) return

    setBusy(true)
    const importResult = await window.api.backup.import(pickResult.data, mode)
    setBusy(false)

    if (importResult.ok) {
      const { added, skipped, removedBeforeImport } = importResult.data
      const parts = [`Restored ${added} domain(s)`]
      if (mode === 'replace') parts.push(`removed ${removedBeforeImport} existing domain(s) first`)
      if (skipped.length > 0) parts.push(`skipped ${skipped.length}: ${skipped.map((s) => s.reason).join(' ')}`)
      const text = parts.join('; ') + '.'
      setMessage(text)
      feedback.push('success', text)
      onRestored(importResult.data.history)
    } else {
      setError(importResult.error.message)
      feedback.push('error', importResult.error.message)
    }
  }

  return (
    <div>
      <h2>Backup &amp; restore</h2>
      <p style={{ color: 'var(--color-text-muted)' }}>
        A deliberate snapshot you create on purpose - separate from Undo/Redo, for reverting to a
        known-good state if something goes wrong later.
      </p>
      <div style={{ display: 'flex', gap: 'var(--spacing-2)', alignItems: 'center', marginBottom: 'var(--spacing-2)' }}>
        <button type="button" onClick={handleExport} disabled={busy} title="Save the current blocklist to a file">
          Export to file…
        </button>
        <span style={{ marginLeft: 'var(--spacing-3)' }}>Restore mode:</span>
        <label>
          <input
            type="radio"
            name="restore-mode"
            checked={mode === 'merge'}
            onChange={() => setMode('merge')}
          />{' '}
          Merge (add to current list)
        </label>
        <label>
          <input
            type="radio"
            name="restore-mode"
            checked={mode === 'replace'}
            onChange={() => setMode('replace')}
          />{' '}
          Replace (clear current list first)
        </label>
        <button
          type="button"
          onClick={handleImport}
          disabled={busy}
          title={mode === 'replace' ? 'Clear the current list, then restore from a backup file' : 'Add domains from a backup file to the current list'}
        >
          Restore from file…
        </button>
      </div>

      {message && <p>{message}</p>}
      {error && <p style={{ color: 'var(--color-danger)' }}>{error}</p>}
    </div>
  )
}
