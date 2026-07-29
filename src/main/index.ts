import { join } from 'node:path'
import { app, BrowserWindow } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { registerBackupHandlers } from './ipc/handlers/backup'
import { registerDomainsHandlers } from './ipc/handlers/domains'
import { registerHistoryHandlers } from './ipc/handlers/history'
import { registerSettingsHandlers } from './ipc/handlers/settings'
import { registerUpdateHandlers } from './ipc/handlers/updates'
import { registerIpcHandlers } from './ipc/registerIpcHandlers'
import { RegeditRsRegistryClient } from './services/regeditRsRegistryClient'
import { FakeRegistryClient } from './testing/fakeRegistryClient'
import { createFakeElevationRunner } from './testing/fakeElevationRunner'
import { BackupService } from './services/backupService'
import { DomainService } from './services/domainService'
import { HistoryService } from './services/historyService'
import { AppLogger } from './services/logger/logger'
import { SettingsStore } from './services/settingsStore'
import { UpdateService } from './services/updateService'
import { createMainWindow } from './windows/mainWindow'

const isTestMode = process.env.NODE_ENV === 'test'

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.cbgithub7.brave-domain-manager')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  const settingsStore = new SettingsStore(join(app.getPath('userData'), 'settings.json'))
  await settingsStore.load()

  const logger = new AppLogger(settingsStore, join(app.getPath('userData'), 'logs'))
  logger.log('startupShutdown', 'info', 'Application started')

  const historyService = new HistoryService()

  // NODE_ENV=test (set by the Playwright E2E suite) swaps in an in-memory
  // registry and a no-op-elevation fake, so E2E tests exercise the real
  // IPC/preload/renderer code paths without touching the real Windows
  // registry or ever needing a UAC prompt in CI.
  const registryClient = isTestMode ? new FakeRegistryClient() : new RegeditRsRegistryClient()
  const runElevated = isTestMode ? createFakeElevationRunner(registryClient) : undefined

  const domainService = new DomainService(registryClient, historyService, logger, runElevated)
  const backupService = new BackupService(domainService, logger)

  registerIpcHandlers()
  registerDomainsHandlers(domainService)
  registerHistoryHandlers(domainService, historyService)
  registerBackupHandlers(backupService)
  registerSettingsHandlers(settingsStore, logger)
  const mainWindow = createMainWindow()

  // Never checks for updates in dev (no dev-app-update.yml, would just error)
  // or in NODE_ENV=test (the Playwright E2E suite) - real network calls have
  // no place in an automated test run.
  const updatesEnabled = app.isPackaged && !isTestMode
  const updateService = new UpdateService(logger, updatesEnabled)
  registerUpdateHandlers(updateService, mainWindow)
  updateService.checkForUpdates()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })

  app.on('before-quit', () => {
    logger.log('startupShutdown', 'info', 'Application shutting down')
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
