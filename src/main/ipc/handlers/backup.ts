import { BrowserWindow, dialog, ipcMain } from 'electron'
import { IPC } from '@shared/ipc-contract'
import type { RestoreMode } from '@shared/backup-types'
import type { BackupService } from '../../services/backupService'
import { wrapHandler } from '../wrapHandler'

const BACKUP_FILE_FILTERS = [
  { name: 'Backup files', extensions: ['json'] },
  { name: 'All files', extensions: ['*'] }
]

export function registerBackupHandlers(backupService: BackupService): void {
  ipcMain.handle(
    IPC.backup.pickSaveFile,
    wrapHandler(async (event: Electron.IpcMainInvokeEvent): Promise<string | null> => {
      const win = BrowserWindow.fromWebContents(event.sender)
      const options: Electron.SaveDialogOptions = {
        filters: BACKUP_FILE_FILTERS,
        defaultPath: `brave-domain-manager-backup-${new Date().toISOString().slice(0, 10)}.json`
      }
      const result = win ? await dialog.showSaveDialog(win, options) : await dialog.showSaveDialog(options)
      if (result.canceled || !result.filePath) return null
      return result.filePath
    })
  )

  ipcMain.handle(
    IPC.backup.pickOpenFile,
    wrapHandler(async (event: Electron.IpcMainInvokeEvent): Promise<string | null> => {
      const win = BrowserWindow.fromWebContents(event.sender)
      const options: Electron.OpenDialogOptions = { properties: ['openFile'], filters: BACKUP_FILE_FILTERS }
      const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options)
      if (result.canceled || result.filePaths.length === 0) return null
      return result.filePaths[0]
    })
  )

  ipcMain.handle(
    IPC.backup.export,
    wrapHandler((_event: Electron.IpcMainInvokeEvent, filePath: string) =>
      backupService.exportToFile(filePath)
    )
  )

  ipcMain.handle(
    IPC.backup.import,
    wrapHandler((_event: Electron.IpcMainInvokeEvent, filePath: string, mode: RestoreMode) =>
      backupService.importFromFile(filePath, mode)
    )
  )
}
