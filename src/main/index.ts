import { app, BrowserWindow } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { registerBackupHandlers } from './ipc/handlers/backup'
import { registerDomainsHandlers } from './ipc/handlers/domains'
import { registerHistoryHandlers } from './ipc/handlers/history'
import { registerSettingsHandlers } from './ipc/handlers/settings'
import { registerIpcHandlers } from './ipc/registerIpcHandlers'
import { RegeditRsRegistryClient } from './services/regeditRsRegistryClient'
import { BackupService } from './services/backupService'
import { DomainService } from './services/domainService'
import { HistoryService } from './services/historyService'
import { AppLogger } from './services/logger/logger'
import { SettingsStore } from './services/settingsStore'
import { createMainWindow } from './windows/mainWindow'

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.cbgithub7.brave-domain-manager')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  const settingsStore = new SettingsStore()
  await settingsStore.load()

  const logger = new AppLogger(settingsStore)
  logger.log('startupShutdown', 'info', 'Application started')

  const historyService = new HistoryService()
  const domainService = new DomainService(new RegeditRsRegistryClient(), historyService, logger)
  const backupService = new BackupService(domainService, logger)

  registerIpcHandlers()
  registerDomainsHandlers(domainService)
  registerHistoryHandlers(domainService, historyService)
  registerBackupHandlers(backupService)
  registerSettingsHandlers(settingsStore, logger)
  createMainWindow()

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
