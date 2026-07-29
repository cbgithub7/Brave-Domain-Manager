import Fuse from 'fuse.js'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { DomainEntry } from '@shared/domain-types'
import type { HistoryStatus } from '@shared/history-types'
import { Button } from '../../components/Button'
import { TextField } from '../../components/TextField'
import { useFeedbackLog } from '../feedback/FeedbackLogContext'
import styles from './DomainList.module.css'

interface DomainListProps {
  /** Bump this to force a refetch (e.g. after FileImportPanel commits an add). */
  refreshSignal?: number
  /** Called with the fresh history status after a successful add/remove. */
  onMutated?: (status: HistoryStatus) => void
  /** Called whenever the current domain count is known, for the rail badge and inspector. */
  onCountChange?: (count: number) => void
}

export function DomainList({ refreshSignal, onMutated, onCountChange }: DomainListProps): JSX.Element {
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
      onCountChange?.(result.data.length)
    } else {
      setError(result.error.message)
    }
  }, [onCountChange])

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
        if (result.data.removed.length === 1) {
          const removedName = result.data.removed[0]
          const removedDomain = domains?.find((d) => d.name === removedName)?.domain ?? removedName
          feedback.push('success', `Removed ${removedDomain}.`)
        } else {
          feedback.push('success', `Removed ${result.data.removed.length} domains.`)
        }
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className={styles.toolbar}>
        <TextField
          className={styles.searchField}
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search blocked domains…"
          title="Fuzzy search the blocked domains list"
        />
        <TextField
          className={styles.addField}
          mono
          value={newDomain}
          onChange={(event) => setNewDomain(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') handleAdd()
          }}
          placeholder="example.com"
          disabled={busy}
          title="Enter a domain to add to the blocklist"
        />
        <Button variant="primary" onClick={handleAdd} disabled={busy || !newDomain.trim()} title="Add this domain">
          Add domain
        </Button>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {domains === null ? (
        <p className={styles.empty}>Loading blocked domains…</p>
      ) : domains.length === 0 ? (
        <p className={styles.empty}>No domains are currently blocked.</p>
      ) : (
        <>
          <div className={styles.summary}>
            <span>
              {searchQuery.trim()
                ? `${displayedDomains.length} of ${domains.length} match`
                : `${domains.length} domain(s) blocked`}
            </span>
            <span className={styles.spacer} />
            <Button
              onClick={() => handleRemove(Array.from(selected))}
              disabled={busy || selected.size === 0}
              title="Delete all checked domains"
            >
              Delete selected ({selected.size})
            </Button>
          </div>
          <ul className={styles.list}>
            {displayedDomains.map((entry) => (
              <li key={entry.name} className={styles.row}>
                <label className={styles.rowLabel}>
                  <input
                    type="checkbox"
                    checked={selected.has(entry.name)}
                    onChange={() => toggleSelected(entry.name)}
                  />
                  <span>{entry.domain}</span>
                </label>
                <Button variant="danger" onClick={() => handleRemove([entry.name])} disabled={busy} title={`Remove ${entry.domain}`}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
