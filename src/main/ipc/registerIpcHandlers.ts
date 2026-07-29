import { app, BrowserWindow, ipcMain } from 'electron'
import { IPC } from '@shared/ipc-contract'
import { wrapHandler } from './wrapHandler'

export function registerIpcHandlers(): void {
  ipcMain.handle(
    IPC.app.version,
    wrapHandler(() => Promise.resolve(app.getVersion()))
  )

  ipcMain.on(IPC.window.minimize, (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize()
  })

  ipcMain.on(IPC.window.maximizeToggle, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    if (win.isMaximized()) {
      win.unmaximize()
    } else {
      win.maximize()
    }
  })

  ipcMain.on(IPC.window.close, (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close()
  })

  ipcMain.handle(IPC.window.isMaximized, (event) => {
    return BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false
  })
}

export function registerWindowStateEvents(win: BrowserWindow): void {
  const notify = (): void => {
    win.webContents.send(IPC.window.maximizeChanged, win.isMaximized())
  }
  win.on('maximize', notify)
  win.on('unmaximize', notify)
}
