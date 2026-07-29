import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { IPC } from '@shared/ipc-contract'

const api = {
  window: {
    minimize: (): void => ipcRenderer.send(IPC.window.minimize),
    maximizeToggle: (): void => ipcRenderer.send(IPC.window.maximizeToggle),
    close: (): void => ipcRenderer.send(IPC.window.close)
  }
}

export type Api = typeof api

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-expect-error (define in dts, only hit when contextIsolation is disabled)
  window.electron = electronAPI
  // @ts-expect-error (define in dts, only hit when contextIsolation is disabled)
  window.api = api
}
