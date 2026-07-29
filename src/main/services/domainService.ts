import { randomUUID } from 'node:crypto'
import type { AddDomainsResult, DomainEntry, RemoveDomainsResult } from '@shared/domain-types'
import { validateDomain } from '@shared/domainValidation'
import type { UndoRedoResult } from '@shared/history-types'
import { AppErrorException } from '../ipc/wrapHandler'
import { runElevatedRegistryBatch } from './elevation/elevate'
import type { DomainMutation } from './historyService'
import type { HistoryService } from './historyService'
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
  constructor(
    private readonly registry: RegistryClient,
    private readonly history: HistoryService
  ) {}

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
      return { added: [], skipped, history: this.history.status() }
    }

    const results = await runElevatedRegistryBatch(
      BRAVE_URL_BLOCKLIST_PATH,
      toWrite.map((entry) => ({ op: 'set', name: entry.name, value: entry.domain }))
    )

    const added: DomainEntry[] = []
    const apply: DomainMutation[] = []
    const invert: DomainMutation[] = []
    for (const entry of toWrite) {
      const result = results.find((r) => r.name === entry.name)
      if (result?.ok) {
        added.push(entry)
        apply.push({ op: 'set', name: entry.name, value: entry.domain })
        invert.push({ op: 'delete', name: entry.name })
      } else {
        skipped.push({ domain: entry.domain, reason: result?.error ?? 'Registry write failed.' })
      }
    }

    if (added.length > 0) {
      this.history.push({
        id: randomUUID(),
        timestamp: Date.now(),
        label: added.length === 1 ? `Add ${added[0].domain}` : `Add ${added.length} domains`,
        apply,
        invert
      })
    }

    return { added, skipped, history: this.history.status() }
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
    if (names.length === 0) {
      return { removed: [], failed: [], history: this.history.status() }
    }

    // Snapshot current values BEFORE deleting, so undo can restore them under
    // their original names rather than freshly-generated ones.
    const existing = await this.registry.listStringValues(BRAVE_URL_BLOCKLIST_PATH)
    const existingByName = new Map(existing.map((entry) => [entry.name, entry.value]))

    const results = await runElevatedRegistryBatch(
      BRAVE_URL_BLOCKLIST_PATH,
      names.map((name) => ({ op: 'delete', name }))
    )

    const removed: string[] = []
    const failed: RemoveDomainsResult['failed'] = []
    const apply: DomainMutation[] = []
    const invert: DomainMutation[] = []

    for (const name of names) {
      const result = results.find((r) => r.name === name)
      if (result?.ok) {
        removed.push(name)
        apply.push({ op: 'delete', name })
        const originalValue = existingByName.get(name)
        if (originalValue !== undefined) {
          invert.push({ op: 'set', name, value: originalValue })
        }
      } else {
        failed.push({ name, reason: result?.error ?? 'Registry write failed.' })
      }
    }

    if (removed.length > 0) {
      this.history.push({
        id: randomUUID(),
        timestamp: Date.now(),
        label: removed.length === 1 ? 'Remove domain' : `Remove ${removed.length} domains`,
        apply,
        invert
      })
    }

    return { removed, failed, history: this.history.status() }
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

  async undo(): Promise<UndoRedoResult> {
    const action = this.history.peekUndo()
    if (!action) {
      throw new AppErrorException('NOT_FOUND', 'Nothing to undo.')
    }

    await this.assertNoExternalConflict(action.invert, `undo "${action.label}"`)

    const results = await runElevatedRegistryBatch(BRAVE_URL_BLOCKLIST_PATH, action.invert)
    const failure = results.find((r) => !r.ok)
    if (failure) {
      throw new AppErrorException('REGISTRY_WRITE_ERROR', `Failed to undo "${action.label}": ${failure.error}`)
    }

    this.history.commitUndo()
    return { label: action.label, history: this.history.status() }
  }

  async redo(): Promise<UndoRedoResult> {
    const action = this.history.peekRedo()
    if (!action) {
      throw new AppErrorException('NOT_FOUND', 'Nothing to redo.')
    }

    await this.assertNoExternalConflict(action.apply, `redo "${action.label}"`)

    const results = await runElevatedRegistryBatch(BRAVE_URL_BLOCKLIST_PATH, action.apply)
    const failure = results.find((r) => !r.ok)
    if (failure) {
      throw new AppErrorException('REGISTRY_WRITE_ERROR', `Failed to redo "${action.label}": ${failure.error}`)
    }

    this.history.commitRedo()
    return { label: action.label, history: this.history.status() }
  }

  /**
   * Cheap safety net against changes made outside this app's own tracking
   * (another running instance, or someone hand-editing the registry)
   * between when a history action was recorded and when it's replayed: one
   * extra unelevated read (reads are in-process and don't need admin - see
   * registryClient.ts), then check each mutation's precondition still holds
   * before spending a UAC prompt on a write that could otherwise silently
   * clobber data this app's history never touched.
   */
  private async assertNoExternalConflict(mutations: DomainMutation[], actionLabel: string): Promise<void> {
    const existing = await this.registry.listStringValues(BRAVE_URL_BLOCKLIST_PATH)
    const currentByName = new Map(existing.map((entry) => [entry.name, entry.value]))

    for (const mutation of mutations) {
      const current = currentByName.get(mutation.name)

      if (mutation.op === 'delete') {
        if (current === undefined) {
          throw new AppErrorException(
            'HISTORY_CONFLICT',
            `Can't ${actionLabel}: entry ${mutation.name} no longer exists. It may have changed outside this app.`
          )
        }
      } else if (current !== undefined && current !== mutation.value) {
        // op === 'set': fine if the slot is empty, or already holds exactly this
        // value (idempotent). A different existing value means something else
        // has since taken this slot.
        throw new AppErrorException(
          'HISTORY_CONFLICT',
          `Can't ${actionLabel}: entry ${mutation.name} now holds "${current}", not what was expected. It may have changed outside this app.`
        )
      }
    }
  }
}
