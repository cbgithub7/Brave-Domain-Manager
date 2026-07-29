import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { app } from 'electron'
import { AppErrorException } from '../../ipc/wrapHandler'

export interface RegistryWriteEntry {
  op: 'set' | 'delete'
  name: string
  value?: string
}

export interface RegistryWriteEntryResult {
  name: string
  ok: boolean
  error?: string
}

interface HelperResultFile {
  results?: RegistryWriteEntryResult[]
  fatalError?: string
}

function getResourcesDir(): string {
  // Dev: project root (app.getAppPath() resolves to the folder containing
  // package.json). Packaged builds need this pointed at process.resourcesPath
  // once Phase 8 wires electron-builder's extraResources for this folder.
  return join(app.getAppPath(), 'resources')
}

function getHelperExePath(): string {
  return join(getResourcesDir(), 'helpers', 'registry-write-helper.exe')
}

function getHelperScriptPath(): string {
  return join(getResourcesDir(), 'helpers', 'registryWriteHelper.js')
}

function psQuote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

/**
 * Runs a batch of registry writes elevated. Launched via PowerShell's
 * Start-Process -Verb RunAs, which goes through ShellExecute/the AppInfo
 * service - the actual path that shows the UAC consent prompt. A plain
 * child_process.spawn() of the helper exe does NOT elevate on its own: spawn
 * uses CreateProcess, which has no consent UI and just fails outright
 * (confirmed empirically - it throws EACCES) even with requireAdministrator
 * in the target's manifest. The manifest is still embedded as defense in
 * depth / correct metadata, but ShellExecute is what actually does the work.
 *
 * Always batch everything that needs writing into one call: one UAC prompt
 * per user action, never one per domain.
 */
export async function runElevatedRegistryBatch(
  registryPath: string,
  entries: RegistryWriteEntry[]
): Promise<RegistryWriteEntryResult[]> {
  const dir = await mkdtemp(join(tmpdir(), 'bdm-'))
  const payloadPath = join(dir, `payload-${randomUUID()}.json`)
  const resultPath = join(dir, `result-${randomUUID()}.json`)

  try {
    await writeFile(payloadPath, JSON.stringify({ path: registryPath, entries }), 'utf-8')

    const argumentList = [getHelperScriptPath(), payloadPath, resultPath].map(psQuote).join(', ')
    const psScript =
      `$p = Start-Process -FilePath ${psQuote(getHelperExePath())} ` +
      `-ArgumentList @(${argumentList}) -Verb RunAs -Wait -PassThru -WindowStyle Hidden; ` +
      `exit $p.ExitCode`

    await new Promise<void>((resolve, reject) => {
      const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psScript], {
        windowsHide: true
      })

      let stderr = ''
      child.stderr?.on('data', (chunk: Buffer) => {
        stderr += chunk.toString()
      })

      child.on('error', reject)
      child.on('exit', (code) => {
        if (code === 0) resolve()
        else reject(new Error(stderr.trim() || `Elevated helper exited with code ${code}`))
      })
    })

    const raw = await readFile(resultPath, 'utf-8')
    const parsed = JSON.parse(raw) as HelperResultFile
    if (parsed.fatalError) {
      throw new AppErrorException('ELEVATION_FAILED', parsed.fatalError)
    }
    return parsed.results ?? []
  } catch (error) {
    if (error instanceof AppErrorException) throw error
    const message = error instanceof Error ? error.message : String(error)
    // Windows error 1223 ("The operation was canceled by the user") is what
    // CreateProcess reports when the user dismisses the UAC prompt.
    if (/cancel/i.test(message) || message.includes('1223')) {
      throw new AppErrorException('ELEVATION_CANCELLED', 'The elevation request was cancelled.')
    }
    throw new AppErrorException('ELEVATION_FAILED', message)
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}
