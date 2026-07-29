import Fuse from 'fuse.js'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { DomainEntry } from '@shared/domain-types'
import type { HistoryStatus } from '@shared/history-types'
import { useFeedbackLog } from '../feedback/FeedbackLogContext'

interface DomainListProps {
  /** Bump this to force a refetch (e.g. after FileImportPanel commits an add). */
  refreshSignal?: number
  /** Called with the fresh history status after a successful add/remove. */
  onMutated?: (status: HistoryStatus) => void
}

export function DomainList({ refreshSignal, onMutated }: DomainListProps): JSX.Element {
  const [domains, setDomains] = useState<DomainEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [newDomain, setNewDomain] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const feedback = useFeedbackLog()

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

  const fuse = useMemo(
    () => new Fuse(domains ?? [], { keys: ['domain'], threshold: 0.4 }),
    [domains]
  )

  const displayedDomains = useMemo(() => {
    if (!domains) return []
    if (!searchQuery.trim()) return domains
    return fuse.search(searchQuery).map((result) => result.item)
  }, [domains, fuse, searchQuery])

  const handleAdd = async (): Promise<void> => {
    const domain = newDomain.trim()
    if (!domain) return

    setBusy(true)
    setError(null)
    const result = await window.api.domains.add([domain])
    setBusy(false)

    if (result.ok) {
      if (result.data.skipped.length > 0) {
        const message = result.data.skipped.map((s) => `${s.domain}: ${s.reason}`).join(' ')
        setError(message)
        feedback.push('warn', message)
      }
      if (result.data.added.length > 0) {
        setNewDomain('')
        feedback.push('success', `Added ${result.data.added[0].domain}.`)
      }
      onMutated?.(result.data.history)
      await refresh()
    } else {
      setError(result.error.message)
      feedback.push('error', result.error.message)
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
        const message = result.data.failed.map((f) => `${f.name}: ${f.reason}`).join(' ')
        setError(message)
        feedback.push('error', message)
      }
      if (result.data.removed.length > 0) {
        feedback.push(
          'success',
          result.data.removed.length === 1 ? 'Removed 1 domain.' : `Removed ${result.data.removed.length} domains.`
        )
      }
      setSelected(new Set())
      onMutated?.(result.data.history)
      await refresh()
    } else {
      setError(result.error.message)
      feedback.push('error', result.error.message)
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
          title="Enter a domain to add to the blocklist"
          style={{ flex: 1, padding: 'var(--spacing-2)' }}
        />
        <button type="button" onClick={handleAdd} disabled={busy || !newDomain.trim()} title="Add this domain">
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
              gap: 'var(--spacing-2)',
              marginBottom: 'var(--spacing-2)'
            }}
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search blocked domains…"
              title="Fuzzy search the blocked domains list"
              style={{ flex: 1, padding: 'var(--spacing-2)' }}
            />
            <button
              type="button"
              onClick={() => handleRemove(Array.from(selected))}
              disabled={busy || selected.size === 0}
              title="Delete all checked domains"
            >
              Delete selected ({selected.size})
            </button>
          </div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>
            {searchQuery.trim()
              ? `${displayedDomains.length} of ${domains.length} domain(s) match.`
              : `${domains.length} domain(s) currently blocked.`}
          </p>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {displayedDomains.map((entry) => (
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
                <button
                  type="button"
                  onClick={() => handleRemove([entry.name])}
                  disabled={busy}
                  title={`Remove ${entry.domain}`}
                >
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
