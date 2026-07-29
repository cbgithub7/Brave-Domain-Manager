import { useState } from 'react'
import type { RestoreMode } from '@shared/backup-types'
import type { HistoryStatus } from '@shared/history-types'
import { Button } from '../../components/Button'
import { Card, CardBody, CardHead } from '../../components/Card'
import { useFeedbackLog } from '../feedback/FeedbackLogContext'
import styles from './BackupPanel.module.css'

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
    <Card>
      <CardHead>
        <h3>Backup &amp; restore</h3>
      </CardHead>
      <CardBody>
        <p className={styles.intro}>
          A deliberate snapshot you create on purpose — separate from Undo/Redo, for reverting to a
          known-good state if something goes wrong later.
        </p>

        <div className={styles.section}>
          <Button onClick={handleExport} disabled={busy} title="Save the current blocklist to a file">
            Export to file…
          </Button>
        </div>

        <div className={styles.section}>
          <span className={styles.label}>Restore mode:</span>
          <label className={styles.radio}>
            <input type="radio" name="restore-mode" checked={mode === 'merge'} onChange={() => setMode('merge')} />
            Merge (add to current list)
          </label>
          <label className={styles.radio}>
            <input
              type="radio"
              name="restore-mode"
              checked={mode === 'replace'}
              onChange={() => setMode('replace')}
            />
            Replace (clear current list first)
          </label>
          <Button
            onClick={handleImport}
            disabled={busy}
            title={
              mode === 'replace'
                ? 'Clear the current list, then restore from a backup file'
                : 'Add domains from a backup file to the current list'
            }
          >
            Restore from file…
          </Button>
        </div>

        {message && <p className={styles.message}>{message}</p>}
        {error && <p className={styles.error}>{error}</p>}
      </CardBody>
    </Card>
  )
}
