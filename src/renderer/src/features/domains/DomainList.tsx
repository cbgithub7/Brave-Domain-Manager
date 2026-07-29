import { useCallback, useEffect, useState } from 'react'
import type { DomainEntry } from '@shared/domain-types'

export function DomainList(): JSX.Element {
  const [domains, setDomains] = useState<DomainEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [newDomain, setNewDomain] = useState('')
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
  }, [refresh])

  const handleAdd = async (): Promise<void> => {
    const domain = newDomain.trim()
    if (!domain) return

    setBusy(true)
    setError(null)
    const result = await window.api.domains.add(domain)
    setBusy(false)

    if (result.ok) {
      setNewDomain('')
      await refresh()
    } else {
      setError(result.error.message)
    }
  }

  const handleRemove = async (name: string): Promise<void> => {
    setBusy(true)
    setError(null)
    const result = await window.api.domains.remove(name)
    setBusy(false)

    if (result.ok) {
      await refresh()
    } else {
      setError(result.error.message)
    }
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
          <p>{domains.length} domain(s) currently blocked:</p>
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
                <span>{entry.domain}</span>
                <button type="button" onClick={() => handleRemove(entry.name)} disabled={busy}>
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
