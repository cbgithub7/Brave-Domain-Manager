import { useState } from 'react'
import type { StagedDomain } from '@shared/domain-types'
import type { HistoryStatus } from '@shared/history-types'
import { Button } from '../../components/Button'
import { Card, CardBody, CardHead } from '../../components/Card'
import { useFeedbackLog } from '../feedback/FeedbackLogContext'
import styles from './FileImportPanel.module.css'

interface FileImportPanelProps {
  onCommitted: (status: HistoryStatus) => void
}

export function FileImportPanel({ onCommitted }: FileImportPanelProps): JSX.Element {
  const [filePath, setFilePath] = useState<string | null>(null)
  const [staged, setStaged] = useState<StagedDomain[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const feedback = useFeedbackLog()

  const loadFile = async (path: string): Promise<void> => {
    setBusy(true)
    setError(null)
    const result = await window.api.domains.loadFileStaged(path)
    setBusy(false)
    if (result.ok) {
      setStaged(result.data)
      feedback.push('info', `Loaded ${result.data.length} entries from ${path}.`)
    } else {
      setError(result.error.message)
      setStaged(null)
      feedback.push('error', result.error.message)
    }
  }

  const handleBrowse = async (): Promise<void> => {
    setError(null)
    const result = await window.api.domains.pickFile()
    if (!result.ok) {
      setError(result.error.message)
      feedback.push('error', result.error.message)
      return
    }
    if (result.data) {
      setFilePath(result.data)
      await loadFile(result.data)
    }
  }

  const validDomains = (staged ?? [])
    .filter((entry) => entry.status.valid)
    .map((entry) => (entry.status.valid ? entry.status.cleaned : ''))

  const handleAddValid = async (): Promise<void> => {
    if (validDomains.length === 0) return
    setBusy(true)
    setError(null)
    const result = await window.api.domains.add(validDomains)
    setBusy(false)
    if (result.ok) {
      if (result.data.skipped.length > 0) {
        const message = result.data.skipped.map((s) => `${s.domain}: ${s.reason}`).join(' ')
        setError(message)
        feedback.push('warn', message)
      }
      if (result.data.added.length > 0) {
        feedback.push('success', `Added ${result.data.added.length} domain(s) from file.`)
      }
      onCommitted(result.data.history)
      setStaged(null)
      setFilePath(null)
    } else {
      setError(result.error.message)
      feedback.push('error', result.error.message)
    }
  }

  const handleClear = (): void => {
    setStaged(null)
    setFilePath(null)
    setError(null)
  }

  return (
    <Card>
      <CardHead>
        <h3>Add from file</h3>
      </CardHead>
      <CardBody>
        <p className={styles.intro}>
          Supported formats: .txt (one domain per line), .csv (one domain per row), .json (array of
          domain strings).
        </p>
        <div className={styles.browseRow}>
          <Button onClick={handleBrowse} disabled={busy} title="Choose a domain list file">
            Browse…
          </Button>
          {filePath && <span className={styles.filePath}>{filePath}</span>}
        </div>

        {error && <p className={styles.error}>{error}</p>}

        {staged && (
          <div>
            <ul className={styles.stagedList}>
              {staged.map((entry, index) => (
                <li key={`${entry.raw}-${index}`} className={styles.stagedRow}>
                  {entry.status.valid ? (
                    <span>{entry.status.cleaned}</span>
                  ) : (
                    <span className={styles.invalid}>
                      {entry.raw} — {entry.status.reason}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <div className={styles.actions}>
              <Button
                variant="primary"
                onClick={handleAddValid}
                disabled={busy || validDomains.length === 0}
                title="Add all valid domains from this file to the blocklist"
              >
                Add {validDomains.length} valid domain(s)
              </Button>
              <Button onClick={handleClear} disabled={busy} title="Discard the staged list">
                Clear
              </Button>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  )
}
