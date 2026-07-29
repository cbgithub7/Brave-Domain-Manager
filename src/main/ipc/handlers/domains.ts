import { ipcMain } from 'electron'
import { IPC } from '@shared/ipc-contract'
import type { DomainService } from '../../services/domainService'
import { wrapHandler } from '../wrapHandler'

export function registerDomainsHandlers(domainService: DomainService): void {
  ipcMain.handle(
    IPC.domains.list,
    wrapHandler(() => domainService.listBlockedDomains())
  )
}
