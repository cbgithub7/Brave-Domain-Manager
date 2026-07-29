import { useState } from 'react'
import type { StagedDomain } from '@shared/domain-types'

interface FileImportPanelProps {
  onCommitted: () => void
}

export function FileImportPanel({ onCommitted }: FileImportPanelProps): JSX.Element {
  const [filePath, setFilePath] = useState<string | null>(null)
  const [staged, setStaged] = useState<StagedDomain[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const loadFile = async (path: string): Promise<void> => {
    setBusy(true)
    setError(null)
    const result = await window.api.domains.loadFileStaged(path)
    setBusy(false)
    if (result.ok) {
      setStaged(result.data)
    } else {
      setError(result.error.message)
      setStaged(null)
    }
  }

  const handleBrowse = async (): Promise<void> => {
    setError(null)
    const result = await window.api.domains.pickFile()
    if (!result.ok) {
      setError(result.error.message)
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
        setError(result.data.skipped.map((s) => `${s.domain}: ${s.reason}`).join(' '))
      }
      onCommitted()
      setStaged(null)
      setFilePath(null)
    } else {
      setError(result.error.message)
    }
  }

  const handleClear = (): void => {
    setStaged(null)
    setFilePath(null)
    setError(null)
  }

  return (
    <div>
      <h2>Add from file</h2>
      <p style={{ color: 'var(--color-text-muted)' }}>
        Supported formats: .txt (one domain per line), .csv (one domain per row), .json (array of
        domain strings).
      </p>
      <div style={{ display: 'flex', gap: 'var(--spacing-2)', marginBottom: 'var(--spacing-3)' }}>
        <button type="button" onClick={handleBrowse} disabled={busy}>
          Browse…
        </button>
        {filePath && <span style={{ alignSelf: 'center' }}>{filePath}</span>}
      </div>

      {error && <p style={{ color: 'var(--color-danger)' }}>{error}</p>}

      {staged && (
        <div>
          <ul style={{ listStyle: 'none', padding: 0, maxHeight: 240, overflow: 'auto' }}>
            {staged.map((entry, index) => (
              <li key={`${entry.raw}-${index}`}>
                {entry.status.valid ? (
                  <span>{entry.status.cleaned}</span>
                ) : (
                  <span style={{ color: 'var(--color-danger)' }}>
                    {entry.raw} — {entry.status.reason}
                  </span>
                )}
              </li>
            ))}
          </ul>
          <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
            <button type="button" onClick={handleAddValid} disabled={busy || validDomains.length === 0}>
              Add {validDomains.length} valid domain(s)
            </button>
            <button type="button" onClick={handleClear} disabled={busy}>
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
