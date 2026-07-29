import type { BrowserWindow } from 'electron'
import { ipcMain } from 'electron'
import { IPC } from '@shared/ipc-contract'
import type { UpdateService } from '../../services/updateService'
import { wrapHandler } from '../wrapHandler'

export function registerUpdateHandlers(updateService: UpdateService, mainWindow: BrowserWindow): void {
  ipcMain.handle(
    IPC.updates.status,
    wrapHandler(() => Promise.resolve(updateService.getStatus()))
  )

  ipcMain.handle(
    IPC.updates.install,
    wrapHandler(() => {
      updateService.installNow()
      return Promise.resolve()
    })
  )

  updateService.onStatusChange((status) => {
    mainWindow.webContents.send(IPC.updates.statusChanged, status)
  })
}
