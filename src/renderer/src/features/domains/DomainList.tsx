import { useEffect, useState } from 'react'
import type { DomainEntry } from '@shared/domain-types'

export function DomainList(): JSX.Element {
  const [domains, setDomains] = useState<DomainEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    window.api.domains.list().then((result) => {
      if (cancelled) return
      if (result.ok) {
        setDomains(result.data)
      } else {
        setError(result.error.message)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return <p style={{ color: 'var(--color-danger)' }}>Failed to load blocked domains: {error}</p>
  }

  if (domains === null) {
    return <p>Loading blocked domains…</p>
  }

  if (domains.length === 0) {
    return <p>No domains are currently blocked.</p>
  }

  return (
    <div>
      <p>{domains.length} domain(s) currently blocked:</p>
      <ul>
        {domains.map((entry) => (
          <li key={entry.name}>{entry.domain}</li>
        ))}
      </ul>
    </div>
  )
}
