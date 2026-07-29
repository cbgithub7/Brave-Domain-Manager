import { readFile, writeFile } from 'node:fs/promises'
import type { BackupExportResult, BackupImportResult, BackupSnapshot, RestoreMode } from '@shared/backup-types'
import { AppErrorException } from '../ipc/wrapHandler'
import type { DomainService } from './domainService'

function isBackupSnapshot(value: unknown): value is BackupSnapshot {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    candidate.version === 1 &&
    typeof candidate.createdAt === 'string' &&
    Array.isArray(candidate.domains) &&
    candidate.domains.every((d) => typeof d === 'string')
  )
}

/**
 * Deliberate, user-triggered long-term snapshots - distinct from undo/redo,
 * which is short-term and session-scoped. This is the safety net the old
 * app's notes asked for ("since registry edits can sometimes lead to
 * unforeseen issues, consider implementing a backup and restore feature")
 * and never got built.
 */
export class BackupService {
  constructor(private readonly domainService: DomainService) {}

  async exportToFile(filePath: string): Promise<BackupExportResult> {
    const domains = await this.domainService.listBlockedDomains()
    const snapshot: BackupSnapshot = {
      version: 1,
      createdAt: new Date().toISOString(),
      domains: domains.map((entry) => entry.domain)
    }

    await writeFile(filePath, JSON.stringify(snapshot, null, 2), 'utf-8')
    return { count: snapshot.domains.length }
  }

  async importFromFile(filePath: string, mode: RestoreMode): Promise<BackupImportResult> {
    let raw: string
    try {
      raw = await readFile(filePath, 'utf-8')
    } catch (error) {
      throw new AppErrorException(
        'FILE_PARSE_ERROR',
        `Could not read ${filePath}: ${error instanceof Error ? error.message : String(error)}`
      )
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      throw new AppErrorException('FILE_PARSE_ERROR', `${filePath} is not valid JSON.`)
    }

    if (!isBackupSnapshot(parsed)) {
      throw new AppErrorException(
        'FILE_PARSE_ERROR',
        `${filePath} is not a valid backup file (expected { version: 1, createdAt, domains: string[] }).`
      )
    }

    let removedBeforeImport = 0
    if (mode === 'replace') {
      const current = await this.domainService.listBlockedDomains()
      if (current.length > 0) {
        const removeResult = await this.domainService.removeDomains(current.map((entry) => entry.name))
        removedBeforeImport = removeResult.removed.length
      }
    }

    const addResult = await this.domainService.addDomains(parsed.domains)
    return {
      added: addResult.added.length,
      skipped: addResult.skipped,
      removedBeforeImport,
      history: addResult.history
    }
  }
}
