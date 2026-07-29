import { autoUpdater } from 'electron-updater'
import type { UpdateStatus } from '@shared/update-types'
import type { AppLogger } from './logger/logger'

function normalizeReleaseNotes(notes: string | { note: string | null }[] | null | undefined): string | null {
  if (!notes) return null
  if (typeof notes === 'string') return notes
  return notes.map((entry) => entry.note).filter(Boolean).join('\n\n') || null
}

/**
 * Thin wrapper around electron-updater's autoUpdater. When disabled (dev mode,
 * or NODE_ENV=test), never touches autoUpdater at all - status stays 'idle'
 * forever, so the renderer needs no special-casing for whether the feature is
 * active; it just never sees a status change.
 */
export class UpdateService {
  private status: UpdateStatus = { state: 'idle' }
  private readonly listeners = new Set<(status: UpdateStatus) => void>()

  constructor(
    private readonly logger: AppLogger,
    private readonly enabled: boolean
  ) {
    if (!this.enabled) return

    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = false

    autoUpdater.on('checking-for-update', () => {
      this.setStatus({ state: 'checking' })
    })
    autoUpdater.on('update-available', (info) => {
      this.setStatus({ state: 'available', version: info.version, releaseNotes: normalizeReleaseNotes(info.releaseNotes) })
    })
    autoUpdater.on('update-not-available', () => {
      this.setStatus({ state: 'not-available' })
    })
    autoUpdater.on('download-progress', (progress) => {
      this.setStatus({ state: 'downloading', percent: Math.round(progress.percent) })
    })
    autoUpdater.on('update-downloaded', (info) => {
      const status: UpdateStatus = {
        state: 'downloaded',
        version: info.version,
        releaseNotes: normalizeReleaseNotes(info.releaseNotes)
      }
      this.setStatus(status)
      this.logger.log('audit', 'info', 'Update downloaded', { version: info.version })
    })
    autoUpdater.on('error', (error) => {
      this.setStatus({ state: 'error', message: error.message })
      this.logger.log('successError', 'error', 'Update check failed', { error: error.message })
    })
  }

  getStatus(): UpdateStatus {
    return this.status
  }

  onStatusChange(callback: (status: UpdateStatus) => void): () => void {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  checkForUpdates(): void {
    if (!this.enabled) return
    autoUpdater.checkForUpdates().catch((error: Error) => {
      this.setStatus({ state: 'error', message: error.message })
      this.logger.log('successError', 'error', 'Update check failed', { error: error.message })
    })
  }

  installNow(): void {
    if (!this.enabled) return
    autoUpdater.quitAndInstall()
  }

  private setStatus(status: UpdateStatus): void {
    this.status = status
    this.listeners.forEach((callback) => callback(status))
  }
}
