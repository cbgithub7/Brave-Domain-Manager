import { ipcMain } from 'electron'
import { IPC } from '@shared/ipc-contract'
import type { AppSettings } from '@shared/settings-types'
import type { AppLogger } from '../../services/logger/logger'
import type { SettingsStore } from '../../services/settingsStore'
import { wrapHandler } from '../wrapHandler'

export function registerSettingsHandlers(settingsStore: SettingsStore, logger: AppLogger): void {
  ipcMain.handle(
    IPC.settings.get,
    wrapHandler(() => Promise.resolve(settingsStore.get()))
  )

  ipcMain.handle(
    IPC.settings.set,
    wrapHandler(async (_event: Electron.IpcMainInvokeEvent, patch: Partial<AppSettings>) => {
      const updated = await settingsStore.set(patch)
      logger.log('configChanges', 'info', 'Settings updated', { patch })
      return updated
    })
  )
}
