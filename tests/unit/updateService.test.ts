import { EventEmitter } from 'node:events'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestLogger } from './testHelpers'

vi.mock('electron-updater', () => {
  const emitter = new EventEmitter()
  return {
    autoUpdater: Object.assign(emitter, {
      autoDownload: false,
      autoInstallOnAppQuit: true,
      checkForUpdates: vi.fn().mockResolvedValue(undefined),
      quitAndInstall: vi.fn()
    })
  }
})

import { autoUpdater } from 'electron-updater'
import { UpdateService } from '../../src/main/services/updateService'

const emitter = autoUpdater as unknown as EventEmitter

describe('UpdateService', () => {
  beforeEach(() => {
    emitter.removeAllListeners()
    vi.clearAllMocks()
  })

  it('never touches autoUpdater when disabled', () => {
    new UpdateService(createTestLogger(), false)
    expect(emitter.listenerCount('update-available')).toBe(0)
  })

  it('maps update-available to an available status', () => {
    const service = new UpdateService(createTestLogger(), true)
    emitter.emit('update-available', { version: '1.2.0', releaseNotes: 'fixed things' })
    expect(service.getStatus()).toEqual({ state: 'available', version: '1.2.0', releaseNotes: 'fixed things' })
  })

  it('joins array-form release notes into one string', () => {
    const service = new UpdateService(createTestLogger(), true)
    emitter.emit('update-downloaded', {
      version: '1.3.0',
      releaseNotes: [
        { version: '1.3.0', note: 'a' },
        { version: '1.2.1', note: 'b' }
      ]
    })
    expect(service.getStatus()).toEqual({ state: 'downloaded', version: '1.3.0', releaseNotes: 'a\n\nb' })
  })

  it('maps download-progress to a rounded percent', () => {
    const service = new UpdateService(createTestLogger(), true)
    emitter.emit('download-progress', { percent: 42.7 })
    expect(service.getStatus()).toEqual({ state: 'downloading', percent: 43 })
  })

  it('maps a missing update to not-available', () => {
    const service = new UpdateService(createTestLogger(), true)
    emitter.emit('update-not-available')
    expect(service.getStatus()).toEqual({ state: 'not-available' })
  })

  it('maps error events to an error status', () => {
    const service = new UpdateService(createTestLogger(), true)
    emitter.emit('error', new Error('network down'))
    expect(service.getStatus()).toEqual({ state: 'error', message: 'network down' })
  })

  it('notifies subscribers on every status change', () => {
    const service = new UpdateService(createTestLogger(), true)
    const seen: unknown[] = []
    const unsubscribe = service.onStatusChange((status) => seen.push(status))
    emitter.emit('checking-for-update')
    unsubscribe()
    emitter.emit('update-not-available')
    expect(seen).toEqual([{ state: 'checking' }])
  })

  it('installNow is a no-op when disabled', () => {
    const service = new UpdateService(createTestLogger(), false)
    service.installNow()
    expect(autoUpdater.quitAndInstall).not.toHaveBeenCalled()
  })

  it('installNow calls quitAndInstall when enabled', () => {
    const service = new UpdateService(createTestLogger(), true)
    service.installNow()
    expect(autoUpdater.quitAndInstall).toHaveBeenCalledTimes(1)
  })
})
