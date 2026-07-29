import { ipcMain } from 'electron'
import { IPC } from '@shared/ipc-contract'
import type { DomainService } from '../../services/domainService'
import type { HistoryService } from '../../services/historyService'
import { wrapHandler } from '../wrapHandler'

export function registerHistoryHandlers(domainService: DomainService, history: HistoryService): void {
  ipcMain.handle(
    IPC.history.status,
    wrapHandler(() => Promise.resolve(history.status()))
  )

  ipcMain.handle(
    IPC.history.undo,
    wrapHandler(() => domainService.undo())
  )

  ipcMain.handle(
    IPC.history.redo,
    wrapHandler(() => domainService.redo())
  )
}
