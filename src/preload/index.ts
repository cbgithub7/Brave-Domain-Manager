import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { BackupExportResult, BackupImportResult, RestoreMode } from '@shared/backup-types'
import type { AddDomainsResult, DomainEntry, RemoveDomainsResult, StagedDomain } from '@shared/domain-types'
import type { HistoryStatus, UndoRedoResult } from '@shared/history-types'
import { IPC, type IpcResult } from '@shared/ipc-contract'
import type { AppSettings } from '@shared/settings-types'

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
    add: (domains: string[]): Promise<IpcResult<AddDomainsResult>> =>
      ipcRenderer.invoke(IPC.domains.add, domains),
    remove: (names: string[]): Promise<IpcResult<RemoveDomainsResult>> =>
      ipcRenderer.invoke(IPC.domains.remove, names),
    pickFile: (): Promise<IpcResult<string | null>> => ipcRenderer.invoke(IPC.domains.pickFile),
    loadFileStaged: (filePath: string): Promise<IpcResult<StagedDomain[]>> =>
      ipcRenderer.invoke(IPC.domains.loadFileStaged, filePath)
  },
  history: {
    status: (): Promise<IpcResult<HistoryStatus>> => ipcRenderer.invoke(IPC.history.status),
    undo: (): Promise<IpcResult<UndoRedoResult>> => ipcRenderer.invoke(IPC.history.undo),
    redo: (): Promise<IpcResult<UndoRedoResult>> => ipcRenderer.invoke(IPC.history.redo)
  },
  backup: {
    pickSaveFile: (): Promise<IpcResult<string | null>> => ipcRenderer.invoke(IPC.backup.pickSaveFile),
    pickOpenFile: (): Promise<IpcResult<string | null>> => ipcRenderer.invoke(IPC.backup.pickOpenFile),
    export: (filePath: string): Promise<IpcResult<BackupExportResult>> =>
      ipcRenderer.invoke(IPC.backup.export, filePath),
    import: (filePath: string, mode: RestoreMode): Promise<IpcResult<BackupImportResult>> =>
      ipcRenderer.invoke(IPC.backup.import, filePath, mode)
  },
  settings: {
    get: (): Promise<IpcResult<AppSettings>> => ipcRenderer.invoke(IPC.settings.get),
    set: (patch: Partial<AppSettings>): Promise<IpcResult<AppSettings>> =>
      ipcRenderer.invoke(IPC.settings.set, patch)
  }
}

export type Api = typeof api

// contextIsolation is always on (see mainWindow.ts) — no fallback branch needed.
contextBridge.exposeInMainWorld('electron', electronAPI)
contextBridge.exposeInMainWorld('api', api)
