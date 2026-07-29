import type { AddDomainsResult, DomainEntry, RemoveDomainsResult } from '@shared/domain-types'
import { validateDomain } from '@shared/domainValidation'
import { AppErrorException } from '../ipc/wrapHandler'
import { runElevatedRegistryBatch } from './elevation/elevate'
import type { RegistryClient } from './registryClient'

export const BRAVE_URL_BLOCKLIST_PATH = 'HKLM\\SOFTWARE\\Policies\\BraveSoftware\\Brave\\URLBlocklist'

/** Yields the smallest available positive-integer name on each call, tracking what it's already handed out. */
function createNameAllocator(existingNames: string[]): () => string {
  const used = new Set(existingNames.map(Number).filter((n) => Number.isInteger(n) && n > 0))
  let cursor = 1
  return () => {
    while (used.has(cursor)) cursor++
    used.add(cursor)
    return String(cursor)
  }
}

export class DomainService {
  constructor(private readonly registry: RegistryClient) {}

  async listBlockedDomains(): Promise<DomainEntry[]> {
    const entries = await this.registry.listStringValues(BRAVE_URL_BLOCKLIST_PATH)
    return entries.map((entry) => ({ name: entry.name, domain: entry.value }))
  }

  /**
   * The single add pipeline for both manual entry (a 1-item array) and
   * file-based bulk import - the old app had two divergent code paths for
   * this, which was its own source of confusion and drift.
   */
  async addDomains(rawDomains: string[]): Promise<AddDomainsResult> {
    const existing = await this.registry.listStringValues(BRAVE_URL_BLOCKLIST_PATH)
    const existingValues = new Set(existing.map((entry) => entry.value))
    const allocateName = createNameAllocator(existing.map((entry) => entry.name))

    const skipped: AddDomainsResult['skipped'] = []
    const seenInBatch = new Set<string>()
    const toWrite: Array<{ name: string; domain: string }> = []

    for (const raw of rawDomains) {
      const validation = validateDomain(raw)
      if (!validation.valid) {
        skipped.push({ domain: raw, reason: validation.reason })
        continue
      }

      const { cleaned } = validation
      if (existingValues.has(cleaned) || seenInBatch.has(cleaned)) {
        skipped.push({ domain: cleaned, reason: 'Already blocked.' })
        continue
      }

      seenInBatch.add(cleaned)
      toWrite.push({ name: allocateName(), domain: cleaned })
    }

    if (toWrite.length === 0) {
      return { added: [], skipped }
    }

    const results = await runElevatedRegistryBatch(
      BRAVE_URL_BLOCKLIST_PATH,
      toWrite.map((entry) => ({ op: 'set', name: entry.name, value: entry.domain }))
    )

    const added: DomainEntry[] = []
    for (const entry of toWrite) {
      const result = results.find((r) => r.name === entry.name)
      if (result?.ok) {
        added.push(entry)
      } else {
        skipped.push({ domain: entry.domain, reason: result?.error ?? 'Registry write failed.' })
      }
    }

    return { added, skipped }
  }

  /** Single add is just addDomains with a 1-item array - same pipeline, no separate code path. */
  async addDomain(domain: string): Promise<DomainEntry> {
    const result = await this.addDomains([domain])
    if (result.added.length > 0) return result.added[0]
    throw new AppErrorException(
      'VALIDATION_ERROR',
      result.skipped[0]?.reason ?? `Failed to add ${domain}.`
    )
  }

  async removeDomains(names: string[]): Promise<RemoveDomainsResult> {
    if (names.length === 0) return { removed: [], failed: [] }

    const results = await runElevatedRegistryBatch(
      BRAVE_URL_BLOCKLIST_PATH,
      names.map((name) => ({ op: 'delete', name }))
    )

    const removed: string[] = []
    const failed: RemoveDomainsResult['failed'] = []
    for (const name of names) {
      const result = results.find((r) => r.name === name)
      if (result?.ok) {
        removed.push(name)
      } else {
        failed.push({ name, reason: result?.error ?? 'Registry write failed.' })
      }
    }

    return { removed, failed }
  }

  /** Single remove is just removeDomains with a 1-item array. */
  async removeDomain(name: string): Promise<void> {
    const result = await this.removeDomains([name])
    if (result.removed.length === 0) {
      throw new AppErrorException(
        'REGISTRY_WRITE_ERROR',
        result.failed[0]?.reason ?? `Failed to remove domain at ${name}.`
      )
    }
  }
}
