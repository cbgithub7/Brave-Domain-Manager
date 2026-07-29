import { useCallback, useEffect, useState } from 'react'
import type { DomainEntry } from '@shared/domain-types'

interface DomainListProps {
  /** Bump this to force a refetch (e.g. after FileImportPanel commits an add). */
  refreshSignal?: number
}

export function DomainList({ refreshSignal }: DomainListProps): JSX.Element {
  const [domains, setDomains] = useState<DomainEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [newDomain, setNewDomain] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    const result = await window.api.domains.list()
    if (result.ok) {
      setDomains(result.data)
      setError(null)
    } else {
      setError(result.error.message)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh, refreshSignal])

  const handleAdd = async (): Promise<void> => {
    const domain = newDomain.trim()
    if (!domain) return

    setBusy(true)
    setError(null)
    const result = await window.api.domains.add([domain])
    setBusy(false)

    if (result.ok) {
      if (result.data.skipped.length > 0) {
        setError(result.data.skipped.map((s) => `${s.domain}: ${s.reason}`).join(' '))
      }
      if (result.data.added.length > 0) setNewDomain('')
      await refresh()
    } else {
      setError(result.error.message)
    }
  }

  const handleRemove = async (names: string[]): Promise<void> => {
    if (names.length === 0) return
    setBusy(true)
    setError(null)
    const result = await window.api.domains.remove(names)
    setBusy(false)

    if (result.ok) {
      if (result.data.failed.length > 0) {
        setError(result.data.failed.map((f) => `${f.name}: ${f.reason}`).join(' '))
      }
      setSelected(new Set())
      await refresh()
    } else {
      setError(result.error.message)
    }
  }

  const toggleSelected = (name: string): void => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 'var(--spacing-2)', marginBottom: 'var(--spacing-3)' }}>
        <input
          type="text"
          value={newDomain}
          onChange={(event) => setNewDomain(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') handleAdd()
          }}
          placeholder="example.com"
          disabled={busy}
          style={{ flex: 1, padding: 'var(--spacing-2)' }}
        />
        <button type="button" onClick={handleAdd} disabled={busy || !newDomain.trim()}>
          Add domain
        </button>
      </div>

      {error && <p style={{ color: 'var(--color-danger)' }}>{error}</p>}

      {domains === null ? (
        <p>Loading blocked domains…</p>
      ) : domains.length === 0 ? (
        <p>No domains are currently blocked.</p>
      ) : (
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 'var(--spacing-2)'
            }}
          >
            <p style={{ margin: 0 }}>{domains.length} domain(s) currently blocked:</p>
            <button
              type="button"
              onClick={() => handleRemove(Array.from(selected))}
              disabled={busy || selected.size === 0}
            >
              Delete selected ({selected.size})
            </button>
          </div>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {domains.map((entry) => (
              <li
                key={entry.name}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 'var(--spacing-1) 0'
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                  <input
                    type="checkbox"
                    checked={selected.has(entry.name)}
                    onChange={() => toggleSelected(entry.name)}
                  />
                  {entry.domain}
                </label>
                <button type="button" onClick={() => handleRemove([entry.name])} disabled={busy}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
