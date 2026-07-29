import type { SkippedDomain } from './domain-types'
import type { HistoryStatus } from './history-types'

export interface BackupSnapshot {
  version: 1
  createdAt: string
  domains: string[]
}

export type RestoreMode = 'replace' | 'merge'

export interface BackupExportResult {
  count: number
}

export interface BackupImportResult {
  added: number
  skipped: SkippedDomain[]
  removedBeforeImport: number
  history: HistoryStatus
}
