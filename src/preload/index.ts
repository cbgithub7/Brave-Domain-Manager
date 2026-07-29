import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { DomainEntry } from '@shared/domain-types'
import { IPC, type IpcResult } from '@shared/ipc-contract'

const api = {
  window: {
    minimize: (): void => ipcRenderer.send(IPC.window.minimize),
    maximizeToggle: (): void => ipcRenderer.send(IPC.window.maximizeToggle),
    close: (): void => ipcRenderer.send(IPC.window.close),
    isMaximized: (): Promise<boolean> => ipcRenderer.invoke(IPC.window.isMaximized),
    onMaximizeChanged: (callback: (isMaximized: boolean) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, isMaximized: boolean): void =>
        callback(isMaximized)
      ipcRenderer.on(IPC.window.maximizeChanged, listener)
      return () => ipcRenderer.removeListener(IPC.window.maximizeChanged, listener)
    }
  },
  domains: {
    list: (): Promise<IpcResult<DomainEntry[]>> => ipcRenderer.invoke(IPC.domains.list),
    add: (domain: string): Promise<IpcResult<DomainEntry>> =>
      ipcRenderer.invoke(IPC.domains.add, domain),
    remove: (name: string): Promise<IpcResult<void>> => ipcRenderer.invoke(IPC.domains.remove, name)
  }
}

export type Api = typeof api

// contextIsolation is always on (see mainWindow.ts) — no fallback branch needed.
contextBridge.exposeInMainWorld('electron', electronAPI)
contextBridge.exposeInMainWorld('api', api)
