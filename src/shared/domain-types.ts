export interface DomainEntry {
  /** Registry value name under URLBlocklist (an app-chosen numeric string, not user-facing). */
  name: string
  /** The actual blocked domain string. */
  domain: string
}

export type DomainSource = 'manual' | 'file'

export interface SkippedDomain {
  domain: string
  reason: string
}

export interface AddDomainsResult {
  added: DomainEntry[]
  skipped: SkippedDomain[]
}

export interface FailedRemoval {
  name: string
  reason: string
}

export interface RemoveDomainsResult {
  removed: string[]
  failed: FailedRemoval[]
}

export type StagedDomainStatus =
  | { valid: true; cleaned: string }
  | { valid: false; reason: string }

export interface StagedDomain {
  raw: string
  status: StagedDomainStatus
}
