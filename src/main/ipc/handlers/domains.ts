import { BrowserWindow, dialog, ipcMain } from 'electron'
import { IPC } from '@shared/ipc-contract'
import type { StagedDomain } from '@shared/domain-types'
import { validateDomain } from '@shared/domainValidation'
import type { DomainService } from '../../services/domainService'
import { parseDomainsFromFile } from '../../services/fileImport'
import { wrapHandler } from '../wrapHandler'

const FILE_FILTERS = [
  { name: 'Domain lists', extensions: ['txt', 'csv', 'json'] },
  { name: 'All files', extensions: ['*'] }
]

export function registerDomainsHandlers(domainService: DomainService): void {
  ipcMain.handle(
    IPC.domains.list,
    wrapHandler(() => domainService.listBlockedDomains())
  )

  ipcMain.handle(
    IPC.domains.add,
    wrapHandler((_event: Electron.IpcMainInvokeEvent, domains: string[]) =>
      domainService.addDomains(domains)
    )
  )

  ipcMain.handle(
    IPC.domains.remove,
    wrapHandler((_event: Electron.IpcMainInvokeEvent, names: string[]) =>
      domainService.removeDomains(names)
    )
  )

  ipcMain.handle(
    IPC.domains.pickFile,
    wrapHandler(async (event: Electron.IpcMainInvokeEvent): Promise<string | null> => {
      const win = BrowserWindow.fromWebContents(event.sender)
      const options: Electron.OpenDialogOptions = { properties: ['openFile'], filters: FILE_FILTERS }
      const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options)
      if (result.canceled || result.filePaths.length === 0) return null
      return result.filePaths[0]
    })
  )

  ipcMain.handle(
    IPC.domains.loadFileStaged,
    wrapHandler(async (_event: Electron.IpcMainInvokeEvent, filePath: string): Promise<StagedDomain[]> => {
      const rawDomains = await parseDomainsFromFile(filePath)
      return rawDomains.map((raw) => {
        const validation = validateDomain(raw)
        return validation.valid
          ? { raw, status: { valid: true, cleaned: validation.cleaned } }
          : { raw, status: { valid: false, reason: validation.reason } }
      })
    })
  )
}
