import { app, BrowserWindow } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { registerBackupHandlers } from './ipc/handlers/backup'
import { registerDomainsHandlers } from './ipc/handlers/domains'
import { registerHistoryHandlers } from './ipc/handlers/history'
import { registerIpcHandlers } from './ipc/registerIpcHandlers'
import { RegeditRsRegistryClient } from './services/regeditRsRegistryClient'
import { BackupService } from './services/backupService'
import { DomainService } from './services/domainService'
import { HistoryService } from './services/historyService'
import { createMainWindow } from './windows/mainWindow'

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.cbgithub7.brave-domain-manager')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  const historyService = new HistoryService()
  const domainService = new DomainService(new RegeditRsRegistryClient(), historyService)
  const backupService = new BackupService(domainService)

  registerIpcHandlers()
  registerDomainsHandlers(domainService)
  registerHistoryHandlers(domainService, historyService)
  registerBackupHandlers(backupService)
  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
